var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.render('index.jade', {pageTitle: 'Hello World'});
});

app.get('/compatibility', function(req, res) {
	var user1 = req.query.user1;
	var user2 = req.query.user2;
	if(!user1 || !user2) {
		return res.end('Please enter the users');
	}
	res.send('First user is ' + user1 + ', second user is ' + user2);
});

var server = app.listen(80);