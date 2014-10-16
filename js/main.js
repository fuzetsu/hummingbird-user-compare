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
            return a[0].title < b[0].title ? -1 : (a[0].title > b[0].title ? 1 : 0);
        });

        for (var i = 0; i < animeInCommon.length; i++) {
            console.log(animeInCommon[i][0].title);
        }
    }

    // MAIN
    // setup references to input elements
    var txtUser1 = document.getElementById('txtUser1'),
        txtUser2 = document.getElementById('txtUser2'),
        btnCompare = document.getElementById('btnCompare'),
        outputDiv = document.getElementById('outputDiv');

    btnCompare.addEventListener('click', function(){
        if (txtUser1.value.trim() && txtUser2.value.trim()) {
            outputDiv.innerHTML = 'Processing...';
            // Can't compare same user
            if (txtUser1.value.trim() === txtUser2.value.trim()) {
                outputDiv.innerHTML = "Can't compare the same user";
                return;
            }

            // get both lists and send them to compare
            Promise.all([hb.getAnimeList(txtUser1.value.trim()), hb.getAnimeList(txtUser2.value.trim())]).done(function(lists) {
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
	var user1 = query['user1'],
		user2 = query['user2'];

    // initialize textboxes if possible
    txtUser1.value = user1 || '';
    txtUser2.value = user2 || '';

    //if there are values in both text boxes automatically run the compare
    if (txtUser1.value.trim() && txtUser2.value.trim())
        btnCompare.click();
}());
