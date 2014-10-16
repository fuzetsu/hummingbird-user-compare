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
        }

    };

    var compare = function(list1, list2) {
        var animeInCommon = [], anime1, anime2;
        for (var i = 0; i < list1.length; i++) { // loop through the first list
            anime1 = list1[i];
             // we want to ignore the plan to watch list
            if (anime1.status == 'plan-to-watch')
                continue;
            for (var j = 0; j < list2.length; j++) { // loop through the second list
                anime2 = list2[j];
                if (anime1.slug === anime2.slug) { // we found a match
                     // ignore plan to watch
                    if (anime2.status !== 'plan-to-watch') {
                        // this anime is in common. add to the array
                        animeInCommon.push([anime1, anime2]);
                    }
                    break;
                }
            }
        }

        // sort the array by the anime's title
        animeInCommon.sort(function(a, b) {
            return a[0].title.toUpperCase() < b[0].title.toUpperCase() ? -1 : (a[0].title.toUpperCase() > b[0].title.toUpperCase() ? 1 : 0);
        });

        //generate html
        var html = '<table><tr><th>Title</th><th>' + user1 + '\'s Rating</th><th>' + user2 + '\'s Rating</th><th>Difference</th></tr>';
        var dif, difCount = 0, difSum = 0, rating1, rating1Count = 0, rating1Sum = 0, rating2, rating2Sum = 0, rating2Count = 0;
        for (var i = 0; i < animeInCommon.length; i++) {
            anime1 = animeInCommon[i][0];
            anime2 = animeInCommon[i][1];

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

        html += '<tr><td>Mean Values (' + animeInCommon.length + ' total)</td><td>' + rating1.toFixed(2) + '</td><td>' + rating2.toFixed(2) + '</td><td>' + dif.toFixed(2) + '</td></tr></table>';

        outputDiv.innerHTML = html;
    }

    // MAIN
    // setup references to input elements
    var txtUser1 = document.getElementById('txtUser1'),
        txtUser2 = document.getElementById('txtUser2'),
        btnCompare = document.getElementById('btnCompare'),
        outputDiv = document.getElementById('outputDiv');

    var user1, user2;

    btnCompare.addEventListener('click', function(){
        user1 = txtUser1.value.trim();
        user2 = txtUser2.value.trim();
        if (user1 && user2) {
            // Can't compare same user
            if (user1 === user2) {
                outputDiv.innerHTML = "Can't compare the same user";
                return;
            }

            outputDiv.innerHTML = 'Processing...';
            // get both lists and send them to compare
            Promise.all([hb.getAnimeList(user1), hb.getAnimeList(user2)]).done(function(lists) {
                compare(lists[0], lists[1]);
            }, function() {
                outputDiv.innerHTML = 'Failed to get list data';
            });
        }
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

    //if there are values in both text boxes automatically run the compare
    if (txtUser1.value.trim() && txtUser2.value.trim())
        btnCompare.click();
}());
