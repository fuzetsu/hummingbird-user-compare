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

    getAnimeListByProxy: function(username) {

      var self = this;

      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('get', 'http://fuzetsu.site90.net/hb.php?user_id=' + escape(username) + '&status=all');
        xhr.responseType = 'document';
        xhr.addEventListener('error', reject);
        xhr.addEventListener('load', function() {
          resolve(JSON.parse(xhr.response.querySelector('pre').textContent));
        });
        xhr.send();
      }).then(function(res) {
        return res.library_entries.map(function(entry, idx) {
          var anime = res.anime[idx];
          entry.rating = self.c10p(entry.rating);
          return Util.extend(entry, anime);
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
          title: anime1[titlePref + '_title'] || anime1.canonical_title,
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
          title: anime1[titlePref + '_title'] || anime1.canonical_title,
          url: hb.ANIME_URL + anime1.anime_id,
          epswatched1: anime1.episodes_watched + '/' + (anime1.episode_count || '?'),
          epsWatchedSort1: anime1.episodes_watched,
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
          title: anime1[titlePref + '_title'] || anime1.canonical_title,
          url: hb.ANIME_URL + anime1.anime_id,
          epswatched1: anime1.episodes_watched + '/' + (anime1.episode_count || '?'),
          epswatched2: anime2.episodes_watched + '/' + (anime2.episode_count || '?'),
          epsWatchedSort1: anime1.episodes_watched,
          epsWatchedSort2: anime2.episodes_watched,
          epdiff: anime1.episodes_watched - anime2.episodes_watched,
          status1: anime1.status,
          status2: anime2.status
        };
      });
    },

    compareLists: function(compareData) {

      var self = this;

      var list1 = compareData.list1,
        list2 = compareData.list2,
        bothCompleted = [],
        user1Incomplete = [],
        user2Incomplete = [],
        bothIncomplete = [];

      list1.forEach(function(anime1) { // loop through the first list
        list2.some(function(anime2) { // loop through the second list
          if (anime1.anime_id === anime2.anime_id) { // we found a match
            if (anime1.status !== 'Completed') {
              if (anime2.status !== 'Completed') {
                bothIncomplete.push([anime1, anime2]);
              } else {
                user1Incomplete.push([anime1, anime2]);
              }
            } else if (anime2.status !== 'Completed') {
              user2Incomplete.push([anime2, anime1]);
            } else {
              bothCompleted.push([anime1, anime2]);
            }
            return true; // start looking for next match
          }
        });
      });

      return Promise.props({

        user1: compareData.user1 + "'s",
        user2: compareData.user2 + "'s",

        bothCompleted: self.processCompletedList(bothCompleted, compareData.titlePref),
        user1Incomplete: self.processOneIncompleteList(user1Incomplete, compareData.titlePref),
        user2Incomplete: self.processOneIncompleteList(user2Incomplete, compareData.titlePref),
        bothIncomplete: self.processBothIncompleteList(bothIncomplete, compareData.titlePref)

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
    }
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
    },

    initForm: function() {
      // parse query string
      var query = Util.parseQuery();
      this.txtUser1.value = query.user1 || '';
      this.txtUser2.value = query.user2 || '';
      this.ddlTitles.value = localStorage.hbirdTitlePref || 'canonical';
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
            function() { // error
              self.toggleLoading('hide');
              self.error('Failed to get list data, check the usernames and try again.');
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

      return Promise
        .all([hb.getAnimeListByProxy(user1), hb.getAnimeListByProxy(user2)])
        .then(function(lists) {
          return hb.compareLists({
            user1: user1,
            user2: user2,
            list1: lists[0],
            list2: lists[1],
            titlePref: UI.ddlTitles.value
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
