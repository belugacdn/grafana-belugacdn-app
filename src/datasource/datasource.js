import _ from "lodash";
import CryptoJS from "../crypto-js";
import moment from "../moment";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
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

  query(options) {
    var query = this.buildQueryParameters(options);

    query.targets = query.targets.filter(t => !t.hide);
    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    var target = options.targets[0];
    var path = '/api/cdn/v2/metrics/' + target.siteName + '/' + target.timeFrame + '/' + target.metricName + '?output=json';

    return this.backendSrv.datasourceRequest({
      url: this.url + path,
      method: 'GET'
    })
    .then(response => {
      response.data = this.formatRawBeluga(response);
      return response;
    });
  }

  formatRawBeluga(data) {
    var output = [];
    if (data.data.series) {
      data = data.data.series;
    }
    _.map(data, (item, index) => {
      var datapoints = _.map(data[index].data, (d) => {
        return [d[1], d[0]];
      });
      output[index] = {
        "target": data[index].name,
        "datapoints": datapoints
      };
    });
    return output;
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url + '/api/token/token',
      method: 'GET'
    }).then(response => {
      if (response.status === 200) {
        this.tokenObj = response.data;
        return {
          status: "success",
          message: "Data source is working",
          title: "Success"
        };
      }
    });
  }

  // currently not being used
  createAuthHeader(method, path) {
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

  annotationQuery(options) {
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
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(options, dimension) {
    var path = '';
    if (options === 'sites') {
      path = "/api/cdn/v2/" + options;
      this.currentDimension = options;
    } else if (dimension === "sites") {
      path = "/api/cdn/v2/" + dimension;
      this.currentDimension = dimension;
    }
    else if (dimension === "metrics") {
      path = "/api/cdn/v2/" + dimension + "/" + options.siteName;
      this.currentDimension = "views";
    }
    else if (dimension === "time_frame"){
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

  mapToTextValue(result) {
    var resultKeys = [];
    resultKeys.push(this.currentDimension);

    // parse available data responses based for metrics
    // https://docs.belugacdn.com/v2/docs/metrics-list
    if (this.currentDimension === 'views') {
      resultKeys.push('codes');
      resultKeys.push('fields');
    }

    // mock the `time_frame` response
    result.data["time_frame"] = [
      {"name": "hour"},
      {"name": "day"},
      {"name": "week"},
      {"name": "month"},
      {"name": "year"}
    ];

    var response = [];
    for (var i = 0;i < resultKeys.length;i++) {
      var r = _.map(result.data[resultKeys[i]], (d) => {
        return {
          text: d.name,
          value: d.name
        };
      });
      response = response.concat(r);
    }
    return response;
  }

  buildQueryParameters(options) {
    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.target),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie',
        siteName: this.templateSrv.replace(target.siteName),
        metricName: this.templateSrv.replace(target.metricName),
        timeFrame: this.templateSrv.replace(target.timeFrame)
      };
    });

    options.targets = targets;

    return options;
  }
}
