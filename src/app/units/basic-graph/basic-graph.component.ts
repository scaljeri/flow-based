import { ChangeDetectorRef, Component, ElementRef, HostBinding, Input, OnInit, ViewChild } from '@angular/core';
import { GoogleCharts } from 'google-charts';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket } from 'flow-based';
import { ConsoleWorker } from '../../workers/console';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';

@Component({
  selector: 'fb-basic-graph',
  templateUrl: './basic-graph.component.html',
  styleUrls: ['./basic-graph.component.scss']
})
export class BasicGraphComponent implements XxlFlowUnit, OnInit {
  @HostBinding('class.is-active') isActive = false;
  @ViewChild('graph') graph: ElementRef;
  chart;
  log: any;
  worker: ConsoleWorker;
  state: XxlFlowUnitState;
  data: number[] = [];
  dataTable;
  count = 0;
  view;


  constructor(private cdr: ChangeDetectorRef,
              private flowService: XxlFlowBasedService) {
    GoogleCharts.load(() => {
      this.dataTable = new GoogleCharts.api.visualization.DataTable();
      this.dataTable.addColumn('number', 'Count');
      this.dataTable.addColumn('number', 'Values');
      this.dataTable.addRows([[0, 0]]);

      this.view = new GoogleCharts.api.visualization.DataView(this.dataTable);
      this.chart = new GoogleCharts.api.visualization.LineChart(this.graph.nativeElement);
      this.chart.draw(this.view);
    });
  }

  ngOnInit() {

  }

  update(value: number): void {
    this.count += 1;
    this.dataTable.addRow([this.count, value]);

    console.log('values == ' + this.dataTable.length);

    if (this.view) {
      const options = {
            chartArea: {width: '100%', height: '100%'},
            forceIFrame: 'false',
            is3D: 'true',
            pieSliceText: 'value',
            sliceVisibilityThreshold: 1 / 20, // Only > 5% will be shown.
            titlePosition: 'none'
          };
      this.chart.draw(this.dataTable, options);
    }
  }

  drawChart(): void {
    // if (this.isReady) {
    //   const data = GoogleCharts.api.visualization.arrayToDataTable([
    //     ['Time', 'Value'],
    //     [0, 0]
    //   ]);
    //
    //   const options = {
    //     chartArea: {width: '100%', height: '100%'},
    //     forceIFrame: 'false',
    //     is3D: 'true',
    //     pieSliceText: 'value',
    //     sliceVisibilityThreshold: 1 / 20, // Only > 5% will be shown.
    //     titlePosition: 'none'
    //   };
    //
    //   this.chart = new GoogleCharts.api.visualization.LineChart(this.graph.nativeElement);
    //   this.chart.draw(data, options);
    // }
  }

  getSockets(): XxlSocket[] {
    return [{
      type: 'in',
      id: 'bg-a'
    }];
  }

  setActive(state): void {
    this.isActive = state;
    // setTimeout(() => {
    //   this.drawChart();
    // });
  }

  addValue(value: number): void {

  }

  setState(state: XxlFlowUnitState): void {
    this.state = state;

    this.worker = this.flowService.getWorker(state.id) as ConsoleWorker;
    this.worker.register(() => {
      this.worker.logs$.subscribe(log => {
        this.log = log.toFixed(3);
        this.update(parseFloat(this.log));
        console.log('received: ' + parseFloat(this.log));
      });
    });
  }
}
