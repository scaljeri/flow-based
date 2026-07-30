import { Component, ElementRef, HostBinding, OnInit, ViewChild } from '@angular/core';
import { NodeService, XxlSocket } from '@scaljeri/flow-based';
import { BasicGraphWorker } from '../../workers/basic-graph';
import { GoogleCharts } from 'google-charts';
import { GoogleChart, GoogleChartDataTable, GoogleChartDataView } from '../../app.models';

const GRAPH_OPTIONS = {
  legend: 'bottom',
  title: 'Data',
  curveType: 'function',
};

@Component({
  standalone: false,
  selector: 'fb-basic-graph',
  templateUrl: './basic-graph.component.html',
  styleUrls: ['./basic-graph.component.scss']
})
export class BasicGraphComponent implements OnInit {
  @HostBinding('class.is-active') isActive = false;
  @ViewChild('graph') graph!: ElementRef;
  chart: GoogleChart | null = null;
  dataTable: GoogleChartDataTable | null = null;
  view: GoogleChartDataView | null = null;
  worker!: BasicGraphWorker;
  startIndex = 0;


  constructor(private service: NodeService) {
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
      const dataTable: GoogleChartDataTable = new GoogleCharts.api.visualization.DataTable();
      this.dataTable = dataTable;

      dataTable.addColumn('number', 'Count');
      dataTable.addColumn('number', 'Values');
      values.forEach((value, index) => {
        dataTable.addRow([index + this.startIndex, value]);
      });


      this.view = new GoogleCharts.api.visualization.DataView(dataTable);
    }

    // `chart` is only created once GoogleCharts.load() has resolved, which can
    // happen after the first stream value arrives; without the extra guard this
    // dereferenced null.
    if (this.view && this.chart) {
      this.chart.draw(this.dataTable, GRAPH_OPTIONS);
    }
  }

  setActive(state: boolean): void {
    this.isActive = state;
    setTimeout(() => {
      this.update();
    });
  }


  onDelete(): void {
    this.service.deleteSelf();

  }

  onClose(): void {
    // TODO
  }

  connected(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

  getFormat(socket: XxlSocket): string {
    return '';
  }

  disconnect(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }
}
