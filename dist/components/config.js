"use strict";

System.register(["lodash"], function (_export, _context) {
  "use strict";

  var _, _createClass, AppConfigCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
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

      _export("AppConfigCtrl", AppConfigCtrl = function () {
        function AppConfigCtrl($scope, $injector, backendSrv) {
          _classCallCheck(this, AppConfigCtrl);

          this.backendSrv = backendSrv;
          this.appEditCtrl.setPreUpdateHook(this.preUpdate.bind(this));
        }

        _createClass(AppConfigCtrl, [{
          key: "preUpdate",
          value: function preUpdate() {
            return this.initDatasource();
          }
        }, {
          key: "initDatasource",
          value: function initDatasource() {
            var self = this;

            // create or update existing datasource
            return self.backendSrv.get('/api/datasources').then(function (results) {

              //check for existing datasource.
              var dsID = 0;
              var foundDS = false;
              _.forEach(results, function (ds) {
                if (foundDS) {
                  return;
                }
                if (ds.name === "belugacdn") {
                  foundDS = true;
                  dsID = ds.id;
                }
              });

              var initUsername = 'your-BelugaCDN@email';
              var initPassword = 'password';

              if (self.appModel.jsonData.username !== '') {
                initUsername = self.appModel.jsonData.username;
              }
              if (self.appModel.jsonData.password !== '') {
                initPassword = self.appModel.jsonData.password;
              }

              // data source update query
              var belugacdn = {
                name: 'belugacdn',
                type: 'grafana-belugacdn-datasource',
                access: 'proxy',
                url: 'https://api.belugacdn.com',
                basicAuth: true,
                basicAuthUser: initUsername,
                basicAuthPassword: initPassword
              };

              var promises = [];
              if (!foundDS) {
                promises.push(self.backendSrv.post('/api/datasources', belugacdn));
              } else {
                promises.push(self.backendSrv.put('/api/datasources/' + dsID, belugacdn));
              }
              return Promise.all(promises);
            });
          }
        }]);

        return AppConfigCtrl;
      }());

      _export("AppConfigCtrl", AppConfigCtrl);

      AppConfigCtrl.templateUrl = 'components/config.html';
    }
  };
});
//# sourceMappingURL=config.js.map
