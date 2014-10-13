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
                xhr.responseType = 'json';
                xhr.open(method, self.API_URL + url, true);
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
            			title: entry.anime.title,
            			status: entry.status,
            			rating: self.c10p(entry.rating.value)
            		};
            	});
        }

    };

    // MAIN

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

	// setup references to input elements
    var txtUser1 = document.getElementById('txtUser1'),
    	txtUser2 = document.getElementById('txtUser2');

    // initialize textboxes if possible
    txtUser1.value = user1 || '';
    txtUser2.value = user2 || '';

}());
