import { ChangeDetectorRef, Component, ElementRef, Host, HostBinding, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { XxlFlowUnit, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { BasicGraphWorker } from '../../workers/basic-graph';
import { GoogleCharts } from 'google-charts';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';

@Component({
  selector: 'fb-basic-graph',
  templateUrl: './basic-graph.component.html',
  styleUrls: ['./basic-graph.component.scss']
})
export class BasicGraphComponent implements XxlFlowUnit, OnInit {
  @HostBinding('class.is-active') isActive = false;
  @ViewChild('graph') graph: ElementRef;
  chart;
  dataTable;
  view;
  worker: BasicGraphWorker;

  constructor(@Host() private service: XxlFlowUnitService) {
  }

  ngOnInit() {
    GoogleCharts.load(() => {
      this.chart = new GoogleCharts.api.visualization.LineChart(this.graph.nativeElement);
    });

    this.worker = this.service.worker as BasicGraphWorker;

    this.worker.getStream().subscribe(val => this.update(this.worker.values));
  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }

  update(values: number[]): void {
    this.dataTable = new GoogleCharts.api.visualization.DataTable();
    this.dataTable.addColumn('number', 'Count');
    this.dataTable.addColumn('number', 'Values');
    values.forEach((value, index) => {
      this.dataTable.addRow([index, value]);
    });

    this.view = new GoogleCharts.api.visualization.DataView(this.dataTable);

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

  setActive(state): void {
    this.isActive = state;
    // setTimeout(() => {
    //   this.drawChart();
    // });
  }


  onDelete(): void {
    this.service.deleteSelf();

  }

  onClose(): void {
    this.service.closeSelf();
  }
}
