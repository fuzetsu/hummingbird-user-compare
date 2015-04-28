var Promise = require('bluebird');
var _ = require('underscore');
var request = Promise.promisifyAll(require('request'));

var API_ROOT = 'https://hummingbird.me/';

var _hb = {

  // convert to 10 point scoring
  c10p: function(score) {
    return score && parseFloat(score) * 2;
  },

  makeAPIRequest: function(path, method) {

    return request[(method || 'get') + 'Async'](API_ROOT + path).then(function(res) {
      res = res[0];
      if (res.statusCode === 200) {
        return JSON.parse(res.body);
      } else {
        throw 'Failed to get list';
      }
    });

  },

  sortLists: function(list1, list2) {

    var ret = {
      bothCompleted: [],
      user1Incomplete: [],
      user2Incomplete: [],
      bothIncomplete: [],
      bothRated: []
    };

    list1.forEach(function(item1) { // loop through the first list
      list2.some(function(item2) { // loop through the second list
        if (item1.id === item2.id) { // we found a match
          if (item1.status !== 'Completed') {
            if (item2.status !== 'Completed') {
              ret.bothIncomplete.push([item1, item2]);
            } else {
              ret.user1Incomplete.push([item1, item2]);
            }
          } else if (item2.status !== 'Completed') {
            ret.user2Incomplete.push([item2, item1]);
          } else {
            ret.bothCompleted.push([item1, item2]);
          }
          if (item1.rating && item2.rating) {
            ret.bothRated.push([item1, item2]);
          }
          return true; // start looking for next match
        }
      });
    });

    return ret;

  },

  calculateCompatibility: function(list) {

    // only bother comparing if there are more than 5 items
    if (list.length < 5) {
      return null;
    }

    var scoreList1 = [];
    var scoreList2 = [];
    var mean1 = 0;
    var mean2 = 0;
    var product = 0;
    var sqmag1 = 0;
    var sqmag2 = 0;
    var i, similarity;

    list.forEach(function(item) {
      var rating1 = item[0].rating;
      var rating2 = item[1].rating;
      scoreList1.push(rating1);
      scoreList2.push(rating2);
      mean1 += rating1;
      mean2 += rating2;
    });

    mean1 /= scoreList1.length;
    mean2 /= scoreList2.length;

    for (i = 0; i < scoreList1.length; i++) {
      product += (scoreList1[i] - mean1) * (scoreList2[i] - mean2);
      sqmag1 += (scoreList1[i] - mean1) * (scoreList1[i] - mean1);
      sqmag2 += (scoreList2[i] - mean2) * (scoreList2[i] - mean2);
    }

    similarity = product / Math.sqrt(sqmag1 * sqmag2);

    return similarity * 100 / 2 + 50;

  },

  getCompatStyle: function(percent) {

    if (!percent) {
      return {
        color: 'black',
        phrase: 'Unknown'
      };
    }

    var compare = function(pair) {
      return percent >= pair[0];
    };

    var colorMap = [
      [90, '#FF0100'],
      [80, '#FF2000'],
      [75, '#FF4D00'],
      [70, '#FF7900'],
      [60, '#FFA200'],
      [50, '#FAAE04'],
      [40, '#AE8741'],
      [30, '#7B636A'],
      [20, '#4f428e'],
      [0, '#2F2AA8']
    ];

    var phraseMap = [
      [90, 'Amazingly High'],
      [80, 'Very High'],
      [75, 'High'],
      [70, 'Somewhat High'],
      [60, 'Medium High'],
      [50, 'Medium'],
      [40, 'Somewhat Low'],
      [30, 'Low'],
      [20, 'Very Low'],
      [0, 'Abysmally Low']
    ];

    return {
      color: colorMap.filter(compare)[0][1],
      phrase: phraseMap.filter(compare)[0][1],
      percent: percent.toFixed(2) + '%',
      value: percent
    };

  },

};

var hb = {

  getList: function(username, type, status) {

    return _hb.makeAPIRequest('/' + (type === 'manga' ? 'manga_' : '') + 'library_entries?user_id=' + username + (status ? '&status=' + status : '')).then(function(res) {
      var items = res[type];
      var library = res[(type === 'manga' ? 'manga_' : '') + 'library_entries'];
      return library.map(function(entry, index) {
        entry.rating = _hb.c10p(entry.rating);
        return _.extend(entry, items[index]);
      });
    });

  },

  compatibility: function(list1, list2, type) {

    if (!list1 || !list2) {
      return;
    }

    // if list wasn't passed, assume username was passed and get list
    if (list1 && !_.isArray(list1)) {
      list1 = this.getList(list1, type);
    } else if (_.isArray(list1[0])) {
      // if list is a 2 dimensional array,
      // then we can use it direclty to determine compat
      return Promise.props(
        _hb.getCompatStyle(
          _hb.calculateCompatibility(list1)
        )
      );
    }

    if (list2 && !_.isArray(list2)) {
      list2 = this.getList(list2, type);
    }

    return Promise.all([list1, list2]).then(function(res) {

      var common = [];
      var list1 = res[0];
      var list2 = res[1];

      list1.forEach(function(item1) {
        list2.some(function(item2) {
          if (item1.id === item2.id) {
            if (item1.rating && item2.rating) {
              common.push([item1, item2]);
            }
            return true;
          }
        });
      });

      var percent = _hb.calculateCompatibility(common);

      return _hb.getCompatStyle(percent);

    });
  }

};

module.exports = hb;
