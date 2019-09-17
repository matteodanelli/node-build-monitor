var request = require('request'),
  async = require('async');

const slug = process.env.BITRISE_SLUG;
const token = process.env.BITRISE_TOKEN;

module.exports = function() {
  var self = this,
    requestBuilds = function(callback) {
      bitriseRequest('/apps/' + slug + '/builds', function(error, response, body) {
        callback(error, body.data);
      });
    },
    requestBuild = function(build, callback) {
      bitriseRequest('/apps/' + slug + '/builds/' + build.slug, function(error, response, body) {
        if (error) {
          callback(error);
          return;
        }

        callback(error, simplifyBuild(body.data));
      });
    },
    queryBuilds = function(callback) {
      requestBuilds(function(error, body) {
        if (error) {
          callback(error);
          return;
        }

        async.map(body, requestBuild, function(error, results) {
          callback(error, results);
        });
      });
    },
    parseDate = function(dateAsString) {
      return new Date(dateAsString);
    },
    getStatus = function(status) {
      var statuses = ['#623F83', '#5AC08D', '#EA3E5C', '#1E49AA'];
      return statuses[status];
    },
    getRequestedFor = function(text) {
      var map = {
        webhook: 'push'
      };

      return map[text] || text;
    },
    getStatusText = function(text) {
      var map = {
        success: 'finished'
      };

      return map[text] || text;
    },
    simplifyBuild = function(res) {
      return {
        id: res.slug,
        project: res.commit_message,
        number: res.branch,
        isRunning: res.status === 0,
        startedAt: parseDate(res.triggered_at),
        finishedAt: parseDate(res.finished_at),
        requestedFor: 'BUILD #' + res.build_number,
        status: getStatus(res.status),
        statusText: getStatusText(res.status_text),
        reason: getRequestedFor(res.triggered_workflow),
        hasErrors: false,
        hasWarnings: false,
        url: 'https://www.' + self.configuration.url + '/build/' + res.slug
      };
    },
    bitriseRequest = function(path, callback) {
      var options = {
        url: 'https://api.' + self.configuration.apiUrl + path,
        json: true,
        headers: {
          Authorization: 'token ' + token
        }
      };

      request(options, callback);
    };

  self.configure = function(config) {
    self.configuration = config;

    self.configuration.apiVersion = self.configuration.apiVersion || 'v0.1';
    self.configuration.url = self.configuration.url || 'bitrise.io';
    self.configuration.apiUrl = self.configuration.url + '/' + self.configuration.apiVersion;
    self.configuration.token = token || '';

    bitriseRequest('/apps/' + slug, function(error, response, body) {
      console.log(body);
      self.configuration.appName = body.data.repo_owner + '/' + body.data.title;
    });
  };

  self.check = function(callback) {
    queryBuilds(callback);
  };
};
