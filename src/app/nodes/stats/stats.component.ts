import { ChangeDetectorRef, Component, ElementRef, Host, HostBinding, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { StatsWorker } from '../../workers/stats';
import { XxlFlowUnitState } from '../../../../projects/flow-based/src/lib/flow-based';
import { GoogleCharts } from 'google-charts';

@Component({
  selector: 'fb-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit, OnDestroy {
  public worker: StatsWorker;
  private state: XxlFlowUnitState;
  public isEditing = false;
  public data: number[][] = [];
  private graphPlaceHolder: ElementRef;
  private chart;

  @ViewChild('distribution')
  set graph(element: ElementRef) {
    this.graphPlaceHolder = element;
    this.chart = null;
  }

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              @Host() private service: NodeService) {
    this.state = service.state;
  }

  distribution(data): void {
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
        this.chart = new GoogleCharts.api.visualization.ColumnChart(this.graphPlaceHolder.nativeElement);
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

  onEdit(isEditing: boolean): void {
    this.isEditing = isEditing;
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
