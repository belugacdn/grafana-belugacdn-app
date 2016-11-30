"use strict";

System.register(["lodash", "../crypto-js", "../moment"], function (_export, _context) {
  "use strict";

  var _, CryptoJS, moment, _createClass, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_cryptoJs) {
      CryptoJS = _cryptoJs.default;
    }, function (_moment) {
      moment = _moment.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export("GenericDatasource", GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;

          // Object to hold Token after auth
          this.tokenObj = {};

          // used by the mapToTextValue conversion helper
          this.currentDimension = "";
        }

        _createClass(GenericDatasource, [{
          key: "query",
          value: function query(options) {
            var _this = this;

            var query = this.buildQueryParameters(options);

            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });
            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            var target = options.targets[0];
            var path = '/api/cdn/v2/metrics/' + target.siteName + '/' + target.timeFrame + '/' + target.metricName + '?output=json';

            return this.backendSrv.datasourceRequest({
              url: this.url + path,
              method: 'GET'
            }).then(function (response) {
              response.data = _this.formatRawBeluga(response);
              return response;
            });
          }
        }, {
          key: "formatRawBeluga",
          value: function formatRawBeluga(data) {
            var output = [];
            if (data.data.series) {
              data = data.data.series;
            }
            _.map(data, function (item, index) {
              var datapoints = _.map(data[index].data, function (d) {
                return [d[1], d[0]];
              });
              output[index] = {
                "target": data[index].name,
                "datapoints": datapoints
              };
            });
            return output;
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            var _this2 = this;

            return this.backendSrv.datasourceRequest({
              url: this.url + '/api/token/token',
              method: 'GET'
            }).then(function (response) {
              if (response.status === 200) {
                _this2.tokenObj = response.data;
                return {
                  status: "success",
                  message: "Data source is working",
                  title: "Success"
                };
              }
            });
          }
        }, {
          key: "createAuthHeader",
          value: function createAuthHeader(method, path) {
            // Put together header to be HMAC-ed
            var preHeader = method + ":" + path + ":";
            var date = moment();
            var tokenId = this.tokenObj.id;
            var token = this.tokenObj.secret;
            date = date.toISOString();
            // date = date + "Z";
            preHeader = preHeader + date;

            // HMAC preHeader
            var authHeader = CryptoJS.HmacSHA512(preHeader, token).toString();
            authHeader = "Token " + tokenId + " " + authHeader;

            return authHeader;
          }
        }, {
          key: "annotationQuery",
          value: function annotationQuery(options) {
            var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
            var annotationQuery = {
              range: options.range,
              annotation: {
                name: options.annotation.name,
                datasource: options.annotation.datasource,
                enable: options.annotation.enable,
                iconColor: options.annotation.iconColor,
                query: query
              },
              rangeRaw: options.rangeRaw
            };

            return this.backendSrv.datasourceRequest({
              url: this.url + '/annotations',
              method: 'POST',
              data: annotationQuery
            }).then(function (result) {
              return result.data;
            });
          }
        }, {
          key: "metricFindQuery",
          value: function metricFindQuery(options, dimension) {
            var path = '';
            if (options === 'sites') {
              path = "/api/cdn/v2/" + options;
              this.currentDimension = options;
            } else if (dimension === "sites") {
              path = "/api/cdn/v2/" + dimension;
              this.currentDimension = dimension;
            } else if (dimension === "metrics") {
              path = "/api/cdn/v2/" + dimension + "/" + options.siteName;
              this.currentDimension = "views";
            } else if (dimension === "time_frame") {
              path = "/api/cdn/v2/" + "metrics" + "/" + options.siteName;
              this.currentDimension = dimension;
            } else {
              path = "";
            }

            return this.backendSrv.datasourceRequest({
              url: this.url + path,
              method: 'GET'
            }).then(this.mapToTextValue.bind(this));
          }
        }, {
          key: "mapToTextValue",
          value: function mapToTextValue(result) {
            var resultKeys = [];
            resultKeys.push(this.currentDimension);

            // parse available data responses based for metrics
            // https://docs.belugacdn.com/v2/docs/metrics-list
            if (this.currentDimension === 'views') {
              resultKeys.push('codes');
              resultKeys.push('fields');
            }

            // mock the `time_frame` response
            result.data["time_frame"] = [{ "name": "hour" }, { "name": "day" }, { "name": "week" }, { "name": "month" }, { "name": "year" }];

            var response = [];
            for (var i = 0; i < resultKeys.length; i++) {
              var r = _.map(result.data[resultKeys[i]], function (d) {
                return {
                  text: d.name,
                  value: d.name
                };
              });
              response = response.concat(r);
            }
            return response;
          }
        }, {
          key: "buildQueryParameters",
          value: function buildQueryParameters(options) {
            var _this3 = this;

            var targets = _.map(options.targets, function (target) {
              return {
                target: _this3.templateSrv.replace(target.target),
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie',
                siteName: _this3.templateSrv.replace(target.siteName),
                metricName: _this3.templateSrv.replace(target.metricName),
                timeFrame: _this3.templateSrv.replace(target.timeFrame)
              };
            });

            options.targets = targets;

            return options;
          }
        }]);

        return GenericDatasource;
      }());

      _export("GenericDatasource", GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
