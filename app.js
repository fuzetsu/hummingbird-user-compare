var hb = require('./lib/hb');

var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var server;

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res) {
  res.render('index.jade', {
    pageTitle: 'Hello World'
  });
});

app.get('/compatibility/:type', function(req, res) {
  var validTypes = ['manga', 'anime'];
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var type = req.params.type;
  var wantsHtml = /\.html$/.test(type);

  if (wantsHtml) {
    type = type.slice(0, -5);
  }

  var equal = function(s) {
    return s === type;
  };

  if (!user1 || !user2) {
    return res.status(400).json({
      status: 400,
      message: 'You must provide both users in the query string'
    });
  } else if (!validTypes.some(equal)) {
    return res.status(400).json({
      status: 400,
      message: 'The type must be one of the following: ' + validTypes.join(',') + ' instead of ' + type
    });
  }

  hb.compatibility(user1, user2, type).then(function(compat) {
    if (wantsHtml) {
      res.render('compat.jade', compat);
    } else {
      res.json(compat);
    }
  });

});

app.get('/library/:type/:user', function(req, res) {

  hb.getList(req.params.user, req.params.type, req.params.status).then(function(list) {
    res.json(list);
  }).catch(function(e) {
    res.end(e);
  });

});

server = app.listen(port);
