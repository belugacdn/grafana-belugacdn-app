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

    // create or update existing datasource
    return self.backendSrv.get('/api/datasources').then(function(results) {

      //check for existing datasource.
      var dsID = 0;
      var foundDS = false;
      _.forEach(results, function(ds) {
        if (foundDS) { return; }
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
}
AppConfigCtrl.templateUrl = 'components/config.html';
