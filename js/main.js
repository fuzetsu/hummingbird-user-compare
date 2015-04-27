(function() {

  var hb = {

    API_URL: 'https://hummingbirdv1.p.mashape.com',
    API_KEY: 'lbeDVnfAkWmsh7aYsrc87ScESQe0p1qlpj4jsnIMayh3tGQNE0',
    ANIME_URL: 'https://hummingbird.me/anime/',

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

    getListByProxy: function(username, type) {

      var self = this;

      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('get', 'http://fuzetsu.site90.net/hb.php?user_id=' + encodeURIComponent(username) + '&type=' + encodeURIComponent(type) + '&status=all');
        xhr.responseType = 'document';
        xhr.addEventListener('error', function() {
          reject(xhr);
          // TODO: remove this and upgrade server
          (new Image()).src = 'https://ga-beacon.appspot.com/UA-61974780-1/hummingbird-user-compare/LOAD_FAILED?pixel';
        });
        xhr.addEventListener('load', function() {
          if (xhr.response.title.indexOf('404') !== -1) {
            reject({
              code: 'no-such-user',
              data: username,
              message: 'user "' + username + '" does not exist'
            });
          } else {
            resolve(JSON.parse(xhr.response.querySelector('pre').textContent));
          }
        });
        xhr.send();
      }).then(function(res) {
        var entries = res.library_entries || res.manga_library_entries;
        return entries.map(function(entry, idx) {
          var content = res[type][idx];
          entry.rating = self.c10p(entry.rating);
          return Util.extend(entry, content);
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
    },

    getTitle: function(content, preference) {
      return content[preference + '_title'] || content.canonical_title || content.english_title || content.romaji_title;
    },

    processCompletedList: function(list, titlePref) {
      var difCount = 0,
        difSum = 0,
        rating1Count = 0,
        rating1Sum = 0,
        rating2Count = 0,
        rating2Sum = 0;

      completedRows = list.map(function(pair) {

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

        return ({
          title: hb.getTitle(anime1, titlePref),
          url: hb.ANIME_URL + anime1.anime_id,
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
      return {
        rows: completedRows,
        rating1Mean: rating1Mean,
        rating2Mean: rating2Mean,
        diffMean: diffMean
      };

    },

    processOneIncompleteList: function(list, titlePref) {
      return list.map(function(pair) {
        var anime1 = pair[0],
          anime2 = pair[1];

        return {
          title: hb.getTitle(anime1, titlePref),
          url: hb.ANIME_URL + anime1.anime_id,
          epswatched1: (anime1.episodes_watched || anime1.chapters_read || 0) + '/' + (anime1.episode_count || anime1.chapter_count || '?'),
          epsWatchedSort1: anime1.episodes_watched || anime1.chapters_read || 0,
          status1: anime1.status,
          status2: anime2.status,
          rating2: anime2.rating || '-',
        };
      });
    },

    processBothIncompleteList: function(list, titlePref) {
      return list.map(function(pair) {
        var anime1 = pair[0],
          anime2 = pair[1];

        return {
          title: hb.getTitle(anime1, titlePref),
          url: hb.ANIME_URL + anime1.anime_id,
          epswatched1: (anime1.episodes_watched || anime1.chapters_read || 0) + '/' + (anime1.episode_count || anime1.chapter_count || '?'),
          epswatched2: (anime2.episodes_watched || anime2.chapters_read || 0) + '/' + (anime2.episode_count || anime2.chapter_count || '?'),
          epsWatchedSort1: anime1.episodes_watched || anime1.chapters_read || 0,
          epsWatchedSort2: anime2.episodes_watched || anime2.chapters_read || 0,
          epdiff: (anime1.episodes_watched || anime1.chapters_read || 0) - (anime2.episodes_watched || anime2.chapters_read || 0),
          status1: anime1.status,
          status2: anime2.status
        };
      });
    },

    calculateCompatibility: function(list) {
      if (list.length < 5) {
        return null;
      }
      var scoreList1 = list.map(function(elem) {
          return elem[0].rating;
        }),
        scoreList2 = list.map(function(elem) {
          return elem[1].rating;
        }),
        mean1 = 0,
        mean2 = 0,
        product = 0,
        sqmag1 = 0,
        sqmag2 = 0,
        i;

      for (i = 0; i < scoreList1.length; i++) {
        mean1 += scoreList1[i];
        mean2 += scoreList2[i];
      }
      mean1 /= scoreList1.length;
      mean2 /= scoreList2.length;

      for (i = 0; i < scoreList1.length; i++) {
        product += (scoreList1[i] - mean1) * (scoreList2[i] - mean2);
        sqmag1 += (scoreList1[i] - mean1) * (scoreList1[i] - mean1);
        sqmag2 += (scoreList2[i] - mean2) * (scoreList2[i] - mean2);
      }

      var similarity = product / Math.sqrt(sqmag1 * sqmag2);
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
        phrase: phraseMap.filter(compare)[0][1]
      };

    },

    compareLists: function(compareData) {

      var self = this;

      var type = compareData.listTypePref;

      var list1 = compareData.list1,
        list2 = compareData.list2,
        bothCompleted = [],
        user1Incomplete = [],
        user2Incomplete = [],
        bothIncomplete = [],
        bothRated = [],
        compat = {};

      list1.forEach(function(item1) { // loop through the first list
        list2.some(function(item2) { // loop through the second list
          if (item1.id === item2.id) { // we found a match
            if (item1.status !== 'Completed') {
              if (item2.status !== 'Completed') {
                bothIncomplete.push([item1, item2]);
              } else {
                user1Incomplete.push([item1, item2]);
              }
            } else if (item2.status !== 'Completed') {
              user2Incomplete.push([item2, item1]);
            } else {
              bothCompleted.push([item1, item2]);
            }
            if (item1.rating && item2.rating) {
              bothRated.push([item1, item2]);
            }
            return true; // start looking for next match
          }
        });
      });

      // get percent and determine color
      compat.percent = self.calculateCompatibility(bothRated);
      compat.style = self.getCompatStyle(compat.percent);

      // format percent
      compat.percent = (compat.percent ? compat.percent.toFixed(2) + '%' : 'Not enough in common.');

      return Promise.props({

        type: type.charAt(0).toUpperCase() + type.slice(1),
        isManga: type === 'manga',

        user1: compareData.user1 + "'s",
        user2: compareData.user2 + "'s",

        bothCompleted: self.processCompletedList(bothCompleted, compareData.titlePref),
        user1Incomplete: self.processOneIncompleteList(user1Incomplete, compareData.titlePref),
        user2Incomplete: self.processOneIncompleteList(user2Incomplete, compareData.titlePref),
        bothIncomplete: self.processBothIncompleteList(bothIncomplete, compareData.titlePref),
        compat: compat
      });
    }
  };

  var Util = {
    parseQuery: function() {
      var query = {};
      window.location.href.slice(window.location.href.lastIndexOf('?') + 1)
        .split('&')
        .forEach(function(pair) {
          var p = pair.split('=');
          query[p[0]] = p[1];
        });
      return query;
    },
    extend: function(orig, ext) {
      var key;
      for (key in ext) {
        if (ext.hasOwnProperty(key)) {
          orig[key] = ext[key];
        }
      }
      return orig;
    },
    q: function(query, context) {
      return (context || document).querySelector(query);
    },
    qq: function(query, context) {
      return [].slice.call((context || document).querySelectorAll(query));
    },
  };

  var UI = {

    init: function() {
      this.setupRefs();
      this.initForm();
      this.bindEvents();
      this.compileTemplates();
      this.registerHelpers();
      //if there are values in both text boxes automatically run the compare
      if (this.txtUser1.value.trim() && this.txtUser2.value.trim()) {
        this.btnCompare.click();
      }
    },

    setupRefs: function() {
      this.txtUser1 = Util.q('#txtUser1');
      this.txtUser2 = Util.q('#txtUser2');
      this.formCompare = Util.q('#formCompare');
      this.ddlTitles = Util.q('#ddlTitles');
      this.loadingIndicator = Util.q('.loading-indicator');
      this.outputDiv = Util.q('#outputDiv');
      this.btnCompare = Util.q('#btnCompare');
      this.ddlListType = Util.q('#ddlListType');
      this.btnShare = Util.q("#btnShareCmp");
    },

    initForm: function() {
      // parse query string
      var query = Util.parseQuery();
      this.txtUser1.value = query.user1 || '';
      this.txtUser2.value = query.user2 || '';
      this.ddlTitles.value = localStorage.hbirdTitlePref || 'canonical';
      this.ddlListType.value = query.type || localStorage.hbirdListTypePref || 'anime';
    },

    bindEvents: function() {

      var self = this;

      self.formCompare.addEventListener('submit', function(e) {
        e.preventDefault();
        var user1 = self.txtUser1.value.trim(),
          user2 = self.txtUser2.value.trim();
        if (user1 && user2) {
          self.outputDiv.innerHTML = '';
          // Can't compare same user
          if (user1 === user2) {
            self.error("Can\'t compare the same user.");
            return;
          }
          self.toggleLoading('show');
          // try displaying the comparison
          self.displayComparison(user1, user2).done(
            self.toggleLoading.bind(self, 'hide'), // success
            function(e) { // error
              self.toggleLoading('hide');
              if (e.code && e.code === 'no-such-user') {
                self.error('User "' + e.data + '" does not exist, fix the name and try again.');
              } else {
                self.error('Failed to get list data, check the usernames and try again.');
              }
              console.error(e);
            }
          );
        } else {
          self.error('Enter two different usernames to compare.');
        }
        return false;
      });

      self.ddlTitles.addEventListener('change', function() {
        localStorage.hbirdTitlePref = this.value;
      });

      self.ddlListType.addEventListener('change', function() {
        localStorage.hbirdListTypePref = this.value;
      });

      self.btnShare.addEventListener('click', function() {
        Modal.open({
          content: '<div class="pure-form"><input type="text" value="http://fuzetsu.github.io/hummingbird-user-compare/?user1=' + self.txtUser1.value + '&user2=' + self.txtUser2.value + '&type=' + self.ddlListType.value + '" size=90 oncontextmenu="this.setSelectionRange(0, this.value.length)" onclick="this.setSelectionRange(0, this.value.length)" readonly/></div>'
        });
      });
    },

    toggleLoading: function(state) {
      if (state === 'show') {
        this.loadingIndicator.removeAttribute('hidden');
        this.outputDiv.style.opacity = 0;
      } else if (state === 'hide') {
        this.loadingIndicator.setAttribute('hidden', '');
        this.outputDiv.style.opacity = 1;
      }
    },

    compileTemplates: function() {
      this.comparisonTableTemplate = Handlebars.compile(Util.q('#comparison-table').innerHTML);
    },

    registerHelpers: function() {
      Handlebars.registerHelper('bold', function(first, second) {
        return (first > second ? 'bold' : '');
      });
    },

    displayComparison: function(user1, user2) {

      var type = UI.ddlListType.value;

      return Promise
        .all([hb.getListByProxy(user1, type), hb.getListByProxy(user2, type)])
        .then(function(lists) {
          return hb.compareLists({
            user1: user1,
            user2: user2,
            list1: lists[0],
            list2: lists[1],
            titlePref: UI.ddlTitles.value,
            listTypePref: type
          });
        }).then(function(data) {
          // generate and output html using data and template
          UI.outputDiv.innerHTML = UI.comparisonTableTemplate(data);
          // make tables sortable
          Util.qq('.sortable').forEach(function(table) {
            sorttable.makeSortable(table);
            // sort table
            sorttable.innerSortFunction.apply(table.querySelector('th'), []);
          });
        });
    },

    error: function(msg) {
      this.outputDiv.innerHTML = '<div class="tac"><strong>' + msg + '</strong></div>';
    },

  };

  UI.init();

}());
