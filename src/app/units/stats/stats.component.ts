import { ChangeDetectorRef, Component, ElementRef, Host, HostBinding, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { StatsWorker } from '../../workers/stats';
import { XxlConnection, FbNode, XxlFlowUnitState, XxlSocket } from 'flow-based';
import { GoogleCharts } from 'google-charts';

@Component({
  selector: 'fb-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements FbNode, OnInit {
  public worker: StatsWorker;
  private state: XxlFlowUnitState;
  data: number[][] = [];
  private graphPlaceHolder: ElementRef;
  private chart;

  @ViewChild('distribution')
  set graph(element: ElementRef) {
    this.graphPlaceHolder = element;
    this.chart = null;
  }

  @HostBinding('class.is-active') isActive = false;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  distribution(data): void {
    if (this.isActive) {
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

  getSockets(): XxlSocket[] {
    return [
      {
        type: 'in',
        format: 'number'
      },
      {
        type: 'out',
        name: 'Min value',
        format: 'number'
      },
      {
        type: 'out',
        name: 'Max value',
        format: 'number'
      }];
  }

  setActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  onReset(): void {
    this.worker.reset();
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.closeSelf();
  }

  get min(): string {
    return this.worker.min === null ? null : this.worker.min.toFixed(4);
  }

  get max(): string {
    return this.worker.max === null ? null : this.worker.max.toFixed(4);
  }

  get avg(): string {
    return this.worker.avg.toFixed(4);
  }

  connected(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

  getFormat(socket: XxlSocket): string {
    return '';
  }

  disconnect(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }
}
