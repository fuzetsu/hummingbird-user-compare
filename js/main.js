(function() {

    var hb = {

        API_URL: 'https://hummingbirdv1.p.mashape.com',
        API_KEY: 'lbeDVnfAkWmsh7aYsrc87ScESQe0p1qlpj4jsnIMayh3tGQNE0',

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

        getAnimeListByProxy: function(username) {
            var self = this;

            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                //xhr.open('get', 'http://fuzetsu.site90.net/hb.php?user_id=' + escape(username));
                xhr.open('get', 'http://leefallat.ca/other/hb.php?user_id=' + escape(username));
                xhr.responseType = 'json';
                xhr.addEventListener('error', reject);
                xhr.addEventListener('load', function() {
                    resolve(xhr.response);
                });
                xhr.send();
            }).then(function(res) {
                return res.library_entries.map(function(entry, idx) {
                    var anime = res.anime[idx];
                    return Util.extend(entry, {
                        canonical_title: anime.canonical_title,
                        english_title: anime.english_title,
                        romaji_title: anime.romaji_title,
                        rating: self.c10p(entry.rating)
                    });
                });
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

    var Util = {
        extend: function(orig, ext) {
            var key;
            for (key in ext) {
                if (ext.hasOwnProperty(key)) {
                    orig[key] = ext[key];
                }
            }
            return orig;
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
                if (anime1.anime_id === anime2.anime_id) { // we found a match
                    if (anime2.status !== 'plan-to-watch') {
                        animeInCommon.push([anime1, anime2]);
                    }
                    return true; // start looking for next match
                }
            });
        });


        return Promise.all(animeInCommon).then(function(common) {

            var difCount = 0,
                difSum = 0,
                rating1Count = 0,
                rating1Sum = 0,
                rating2Count = 0,
                rating2Sum = 0,
                rows = [];

            common.forEach(function(pair) {

                var anime1 = pair[0],
                    anime2 = pair[1];

                var rating1 = '-',
                    rating2 = '-',
                    diff = '';

                if (anime1.rating && anime2.rating) {
                    diff = anime1.rating - anime2.rating;
                    difCount++;
                    difSum += diff;
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

                rows.push({
                    title: anime1[titles + '_title'] || anime1.canonical_title,
                    rating1: rating1,
                    rating2: rating2,
                    diff: diff
                });

            });

            // calculate means
            var rating1Mean = '-',
                rating2Mean = '-',
                diffMean = '';
            if (rating1Count > 0)
                rating1Mean = (rating1Sum / rating1Count).toFixed(2);
            if (rating2Count > 0)
                rating2Mean = (rating2Sum / rating2Count).toFixed(2);
            if (difCount > 0)
                diffMean = (difSum / difCount).toFixed(2);

            // set up data for template
            var data = {
                user1: user1 + "'s",
                user2: user2 + "'s",
                rows: rows,
                rating1Mean: rating1Mean,
                rating2Mean: rating2Mean,
                diffMean: diffMean
            };

            // generate and output html using data and template
            outputDiv.innerHTML = comparisonTableTemplate(data);

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

    // Handlebars Helpers
    Handlebars.registerHelper('bold', function(first, second) {
        return (first > second ? 'bold' : '');
    });

    // precompile templates
    var comparisonTableTemplate = Handlebars.compile(document.getElementById('comparison-table').innerHTML);

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
            outputDiv.style.opacity = 0;
            outputDiv.innerHTML = '';
            // Can't compare same user
            if (user1 === user2) {
                compError("Can\'t compare the same user.");
                outputDiv.style.opacity = 1;
                return;
            }

            loadingIndicator.removeAttribute('hidden');
            // get both lists and send them to compare
            Promise.all([hb.getAnimeListByProxy(user1), hb.getAnimeListByProxy(user2)]).done(function(lists) {
                compare(lists[0], lists[1]).done(function() {
                    loadingIndicator.setAttribute('hidden', '');
                    outputDiv.style.opacity = 1;
                });
            }, function() {
                loadingIndicator.setAttribute('hidden', '');
                outputDiv.style.opacity = 1;
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
