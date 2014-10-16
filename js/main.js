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
            			title: entry.anime.title,
            			status: entry.status,
            			rating: self.c10p(entry.rating.value)
            		};
            	});
        }

    };

    var compare = function(list1, list2) {
    }

    // MAIN
    // setup references to input elements
    var txtUser1 = document.getElementById('txtUser1'),
        txtUser2 = document.getElementById('txtUser2'),
        btnCompare = document.getElementById('btnCompare'),
        outputDiv = document.getElementById('outputDiv');

    btnCompare.addEventListener('click', function(){
        if (txtUser1.value.trim() && txtUser2.value.trim()) {
            // Can't compare same user
            if (txtUser1.value.trim() === txtUser2.value.trim()) {
                outputDiv.innerHTML = "Can't compare the same user";
                return;
            }

            hb.getAnimeList(txtUser1.value.trim()).done(function(list1) { // got list for first user
                hb.getAnimeList(txtUser2.value.trim()).done(function(list2) { // got list for second user
                    compare(list1, list2)
                }, function() { // failed to get list for second user
                    outputDiv.innerHTML = 'Failed to get list data for ' + txtUser2.value.trim();
                });
            }, function() { // failed to get list for first user
                outputDiv.innerHTML = 'Failed to get list data for ' + txtUser1.value.trim();
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
