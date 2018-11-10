import { Component, ElementRef, Host, HostBinding, OnInit, ViewChild } from '@angular/core';
import { XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { BasicGraphWorker } from '../../workers/basic-graph';
import { GoogleCharts } from 'google-charts';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';

const GRAPH_OPTIONS = {
  legend: 'bottom',
  title: 'Data',
  curveType: 'function',
};

@Component({
  selector: 'fb-basic-graph',
  templateUrl: './basic-graph.component.html',
  styleUrls: ['./basic-graph.component.scss']
})
export class BasicGraphComponent implements OnInit {
  @HostBinding('class.is-active') isActive = false;
  @ViewChild('graph') graph: ElementRef;
  chart;
  dataTable;
  view;
  worker: BasicGraphWorker;
  startIndex = 0;


  constructor(@Host() private service: NodeService) {
  }

  ngOnInit() {
    GoogleCharts.load(() => {
      this.chart = new GoogleCharts.api.visualization.LineChart(this.graph.nativeElement);
    });

    this.worker = this.service.worker as BasicGraphWorker;

    this.worker.getStream().subscribe(val => this.update(this.worker.values));
  }

  update(values?: number[]): void {
    if (values) {
      if (this.dataTable && values.length === this.dataTable.getNumberOfRows()) {
        this.startIndex++;
      }
      this.dataTable = new GoogleCharts.api.visualization.DataTable();
      this.dataTable.addColumn('number', 'Count');
      this.dataTable.addColumn('number', 'Values');
      values.forEach((value, index) => {
        this.dataTable.addRow([index + this.startIndex, value]);
      });


      this.view = new GoogleCharts.api.visualization.DataView(this.dataTable);
    }

    if (this.view) {
      this.chart.draw(this.dataTable, GRAPH_OPTIONS);
    }
  }

  setActive(state): void {
    this.isActive = state;
    setTimeout(() => {
      this.update();
    });
  }


  onDelete(): void {
    this.service.deleteSelf();

  }

  onClose(): void {
    this.service.closeSelf();
  }

  connected(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

  getFormat(socket: XxlSocket): string {
    return '';
  }

  disconnect(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }
}
