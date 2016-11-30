import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!';

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector, uiSegmentSrv)  {
    super($scope, $injector);

    this.scope = $scope;
    this.uiSegmentSrv = uiSegmentSrv;

    this.target.siteName = this.target.siteName || 'select site';
    this.target.metricName = this.target.metricName || 'select metric';
  }

  // Transform options with uiSegmentSrv to use with metric-segment-model
  getOptions(dimension) {
    return this.datasource.metricFindQuery(this.target, dimension)
      .then(this.uiSegmentSrv.transformToSegments(false));
  }

  onChangeInternal() {
    this.panelCtrl.refresh();
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'datasource/query_ctrl.html';
