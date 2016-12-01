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
    var queries = [];
    _.each(options.targets, _.bind(function (target) {
      if (target.hide) {
        return;
      }
      var query = this.buildQueryParameters(options);
      queries.push(query);
    }, this));

    var query = this.buildQueryParameters(options);

    query.targets = query.targets.filter(t => !t.hide);
    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    var allQueryPromise = _.map(queries, _.bind(function (query, index) {
      return this.makeQueryCall(query, options.targets[index], options);
    }, this));
    return this.q.all(allQueryPromise)
      .then(function (allResponse) {
        var result = [];
        _.each(allResponse, function (response) {
          _.each(response.data, function (d) {
            result.push(d);
          });
        });
        return { data: result };
      });
  }

  makeQueryCall(query, target, options) {
    var rStart = Math.round(Date.parse(options.range.from._d)/1000).toString();
    var rEnd = Math.round(Date.parse(options.range.to._d)/1000).toString();
    var timeFrame = rStart + '-' + rEnd;
    var path = '/api/cdn/v2/metrics/' + target.siteName + '/' + timeFrame + '/' + target.metricName + '?output=json';
    var url = this.url + path;

    return this.backendSrv.datasourceRequest({
      url: url,
      method: 'GET'
    }).then(response => {
      if (!response.error) {
        var result = this.formatRawBeluga(response, target);
        return { data: result };
      }
    });
  }

  formatRawBeluga(data, target) {
    if (!data.data.error){
      var output = [];
      if (data.data.series) {
        data = data.data.series;
      }
      _.map(data, (item, index) => {
        var datapoints = _.map(data[index].data, (d) => {
          return [d[1], d[0]];
        });
        var label = target.siteName + " - " + data[index].name;
        output[index] = {
          "target": label,
          "datapoints": datapoints
        };
      });
      return output;
    }
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
    }
    else if (dimension === "sites") {
      path = "/api/cdn/v2/" + dimension;
      this.currentDimension = dimension;
    }
    else if (dimension === "metrics") {
      path = "/api/cdn/v2/" + dimension;
      path = path + "/" +  this.templateSrv.replace(options.siteName);
      this.currentDimension = "views";
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
        metricName: this.templateSrv.replace(target.metricName)
      };
    });

    options.targets = targets;

    return options;
  }
}
