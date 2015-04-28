var hb = require('./lib/hb');

var express = require('express');
var app = express();
var server;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.render('index.jade', {
    pageTitle: 'Hello World'
  });
});

app.get('/compatibility/:type', function(req, res) {
  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var type = req.params.type;
  var wantsJson = /\.json$/.test(type);
  if (!user1 || !user2) {
    return res.status(400).json({
      status: 400,
      message: 'You must provide both users in the query string'
    });
  } else if (['manga', 'anime'].indexOf(type) == -1) {}
  if (wantsJson) {
    type = type.slice(0, -5);
  }
  hb.compatibility(user1, user2, type).then(function(compat) {
    switch (req.accepts(['html', 'json'])) {
      case 'html':
        res.render('compat.jade', compat);
        break;
      default:
        res.json(compat);
        break;
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

server = app.listen(80);
