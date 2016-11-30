import _ from "lodash";

export class AppConfigCtrl {
  constructor($scope, $injector, backendSrv) {
    this.backendSrv = backendSrv;
    this.appEditCtrl.setPreUpdateHook(this.preUpdate.bind(this));
  }

  preUpdate() {
    return this.initDatasource();
  }

  initDatasource() {
    var self = this;

    //check for existing datasource.
    return self.backendSrv.get('/api/datasources').then(function(results) {
      var foundDS = false;
      _.forEach(results, function(ds) {
        if (foundDS) { return; }
        if (ds.name === "belugacdn") {
          foundDS = true;
        }
      });
      var promises = [];
      if (!foundDS) {
        var initUsername = 'your-BelugaCDN@email';
        var initPassword = 'password';

        // create datasource
        var belugacdn = {
          name: 'belugacdn',
          type: 'grafana-belugacdn-datasource',
          access: 'proxy',
          url: 'https://api.belugacdn.com',
          basicAuth: true,
          basicAuthUser: initUsername,
          basicAuthPassword: initPassword
        };
        promises.push(self.backendSrv.post('/api/datasources', belugacdn));
      }
      return Promise.all(promises);
    });
  }
}
AppConfigCtrl.templateUrl = 'components/config.html';
