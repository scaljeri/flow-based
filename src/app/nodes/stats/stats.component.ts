import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NodeService, FbNodeState } from '@scaljeri/flow-based';
import { StatsDistribution, StatsWorker } from '../../workers/stats';
import { GoogleCharts } from 'google-charts';
import { GoogleChart } from '../../app.models';

@Component({
  standalone: false,
  selector: 'fb-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit, OnDestroy {
  public worker!: StatsWorker;
  private state: FbNodeState;
  public data: number[][] = [];
  // The `#distribution` div lives inside <fb-normal-node>'s content, which is
  // removed while the node is being edited, so the query legitimately resolves
  // to nothing and Angular calls the setter with `undefined`.
  private graphPlaceHolder?: ElementRef;
  private chart: GoogleChart | null = null;

  @ViewChild('distribution')
  set graph(element: ElementRef | undefined) {
    this.graphPlaceHolder = element;
    this.chart = null;
  }

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              private service: NodeService) {
    this.state = service.state;
  }

  distribution(data: StatsDistribution): void {
      const placeHolder = this.graphPlaceHolder;

      if (!placeHolder) {
        return;
      }

      const dataTable = new GoogleCharts.api.visualization.DataTable();
      dataTable.addColumn('number', 'Value');
      dataTable.addColumn('number', 'Count');
      dataTable.addColumn('number', 'Gauss');

      const width = this.worker.columnWidth;
      let count = 0;

      while ((count - 1) * width < data.end) {
        dataTable.addRow([data.start + count++ * width + width / 2, data.values[count], data.gauss ? data.gauss[count] : null]);
      }

      const view = new GoogleCharts.api.visualization.DataView(dataTable);
      if (!this.chart) {
        const chart: GoogleChart = new GoogleCharts.api.visualization.ColumnChart(placeHolder.nativeElement);
        this.chart = chart;
      }
      this.chart.draw(view, {legend: 'top', series: {1: {type: 'line'}}});
  }

  ngOnInit(): void {
    this.worker = this.service.worker as StatsWorker;

    this.worker.updated$.subscribe(data => {
      if (this.graphPlaceHolder) {
        this.distribution(data);
      }

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.cdr.detach();
  }

  onReset(): void {
    this.worker.reset();
  }

  get min(): string | null {
    return this.worker.min === null ? null : this.worker.min.toFixed(4);
  }

  get max(): string | null {
    return this.worker.max === null ? null : this.worker.max.toFixed(4);
  }

  get avg(): string {
    return this.worker.avg.toFixed(4);
  }
}
