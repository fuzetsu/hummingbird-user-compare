(function() {

    var hb = {

        API_URL: 'https://hummingbirdv1.p.mashape.com',
        API_KEY: 'nr5IdgBU8pmshScE5qxAH92MmFwWp1oqx4mjsnA5igw5vcKlXu',

        // convert to 10 point scoring
        c10p: function(score) {
            return score && parseFloat(score) * 2;
        },

        sendAPIRequest: function(method, url, data) {

            var self = this;
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open(method, self.API_URL + url, true);
                xhr.responseType = 'json';
                xhr.addEventListener('error', reject);
                xhr.addEventListener('load', function() {
                    resolve(xhr.response);
                });
                xhr.setRequestHeader('X-Mashape-Key', self.API_KEY);
                xhr.send(data);
            });

        },

        getAnimeList: function(username) {

            var self = this;

            return self
                .sendAPIRequest('get', '/users/' + username + '/library', null)
                .map(function(entry) {
                    return {
                        slug: entry.anime.slug,
                        title: entry.anime.title,
                        status: entry.status,
                        rating: self.c10p(entry.rating.value)
                    };
                });
        },

        getAnime: function(slug, titleLanguage) {
            var self = this;

            return self
                .sendAPIRequest('get', '/anime/' + slug + '?title_language_preference=' + titleLanguage, null)
                .then(function(anime) {
                    return {
                        slug: anime.slug,
                        title: anime.title
                    };
                });
        }
    };

    var compare = function(list1, list2) {
        // get title language preference
        var titles = ddlTitles.value;

        var animeInCommon = [];

        list1.forEach(function(anime1) { // loop through the first list
            // we want to ignore the plan to watch list
            if (anime1.status === 'plan-to-watch') return;
            list2.some(function(anime2) { // lopo through the second list
                if (anime1.slug === anime2.slug) { // we found a match
                    if (anime2.status !== 'plan-to-watch') {
                        if (titles === 'canonical') {
                            animeInCommon.push([anime1, anime2]);
                        } else {
                            animeInCommon.push(hb.getAnime(anime1.slug, titles).then(function(aTitle) {
                                anime1.title = anime2.title = aTitle.title;
                                return [anime1, anime2];
                            }));
                        }
                    }
                    return true; // start looking for next match
                }
            });
        });

        return Promise.all(animeInCommon).then(function(common) {
            //generate html
            var html = '<table class="pure-table pure-table-striped sortable" id="outputTable"><thead><tr><th>Title</th><th>' + user1 + '\'s Rating</th><th>' + user2 + '\'s Rating</th><th class="sorttable_nosort">Difference</th></tr></thead><tbody>';
            var dif, difCount = 0,
                difSum = 0,
                rating1, rating1Count = 0,
                rating1Sum = 0,
                rating2, rating2Sum = 0,
                rating2Count = 0;
            for (var i = 0; i < common.length; i++) {
                anime1 = common[i][0];
                anime2 = common[i][1];

                rating1 = rating2 = '-';
                dif = '';
                if (anime1.rating && anime2.rating) {
                    dif = anime1.rating - anime2.rating;
                    difCount++;
                    difSum += dif;
                }
                if (anime1.rating) {
                    rating1 = anime1.rating;
                    rating1Count++;
                    rating1Sum += rating1;
                }
                if (anime2.rating) {
                    rating2 = anime2.rating;
                    rating2Count++;
                    rating2Sum += rating2;
                }

                html += '<tr><td>' + anime1.title + '</td><td>' + rating1 + '</td><td>' + rating2 + '</td><td>' + dif + '</td></tr>';
            }
            // calculate means
            rating1 = rating2 = '-';
            dif = '';
            if (rating1Count > 0)
                rating1 = rating1Sum / rating1Count;
            if (rating2Count > 0)
                rating2 = rating2Sum / rating2Count;
            if (difCount > 0)
                dif = difSum / difCount;

            html += '<tr></tbody><tfoot><td>Mean Values (' + common.length + ' total)</td><td>' + rating1.toFixed(2) + '</td><td>' + rating2.toFixed(2) + '</td><td>' + dif.toFixed(2) + '</td></tr></tfoot></table>';
            outputDiv.innerHTML = html;

            // make table sortable
            var table = document.getElementById('outputTable');
            sorttable.makeSortable(table);
            // sort table
            sorttable.innerSortFunction.apply(table.getElementsByTagName('th')[0], []);
        });
    };

    var compError = function(msg) {
        outputDiv.innerHTML = '<div class="tac"><strong>' + msg + '</strong></div>';
    };

    // MAIN
    // setup references to input elements
    var txtUser1 = document.getElementById('txtUser1'),
        txtUser2 = document.getElementById('txtUser2'),
        formCompare = document.getElementById('formCompare'),
        ddlTitles = document.getElementById('ddlTitles'),
        loadingIndicator = document.querySelector('.loading-indicator'),
        outputDiv = document.getElementById('outputDiv');

    var user1, user2;

    formCompare.addEventListener('submit', function(e) {
        e.preventDefault();
        user1 = txtUser1.value.trim();
        user2 = txtUser2.value.trim();
        if (user1 && user2) {
            outputDiv.innerHTML = '';
            // Can't compare same user
            if (user1 === user2) {
                compError("Can\'t compare the same user.");
                return;
            }

            loadingIndicator.removeAttribute('hidden');
            // get both lists and send them to compare
            Promise.all([hb.getAnimeList(user1), hb.getAnimeList(user2)]).done(function(lists) {
                compare(lists[0], lists[1]).done(function() {
                    loadingIndicator.setAttribute('hidden', '');
                });
            }, function() {
                loadingIndicator.setAttribute('hidden', '');
                compError('Failed to get list data, check the usernames and try again.');
            });
        }
        return false;
    });

    ddlTitles.addEventListener('change', function() {
        localStorage.hbirdTitlePref = ddlTitles.value;
    });

    // parse query string
    var query = {};
    window.location.href.slice(window.location.href.lastIndexOf('?') + 1)
        .split('&')
        .forEach(function(pair) {
            var p = pair.split('=');
            query[p[0]] = p[1];
        });

    // if possible get usernames from query string
    user1 = query['user1'];
    user2 = query['user2'];

    // initialize textboxes if possible
    txtUser1.value = user1 || '';
    txtUser2.value = user2 || '';

    // initialize title dropdown
    ddlTitles.value = localStorage.hbirdTitlePref || 'canonical';

    //if there are values in both text boxes automatically run the compare
    if (txtUser1.value.trim() && txtUser2.value.trim())
        btnCompare.click();
}());
