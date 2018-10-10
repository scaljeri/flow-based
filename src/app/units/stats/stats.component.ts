import { Component, ElementRef, Host, HostBinding, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { StatsWorker } from '../../workers/stats';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket } from 'flow-based';
import { GoogleCharts } from 'google-charts';

@Component({
  selector: 'fb-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements XxlFlowUnit, OnInit {
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
              private flowService: XxlFlowBasedService,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  distribution(data): void {
    if (this.isActive) {
      const dataTable = new GoogleCharts.api.visualization.DataTable();
      dataTable.addColumn('number', 'Value');
      dataTable.addColumn('number', 'Count');
      data.forEach((v, i) => {
        dataTable.addRows([[i, v]]);
      });

      const view = new GoogleCharts.api.visualization.DataView(dataTable);
      if (!this.chart) {
        this.chart = new GoogleCharts.api.visualization.LineChart(this.graphPlaceHolder.nativeElement);
      }
      this.chart.draw(view);
    }
  }

  ngOnInit(): void {
    this.worker = this.flowService.getWorker(this.state.id) as StatsWorker;
    this.worker.updated$.subscribe(data => {
      if (this.graphPlaceHolder) {
        this.distribution(data);
      }
    });
  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }

  setActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  onDelete(): void {
    this.flowService.delete(this.state);
  }

  onClose(): void {
    this.flowService.close(this.state);
  }

  get min(): string {
    return this.worker.min === undefined ? null : this.worker.min.toFixed(4);
  }

  get max(): string {
    return this.worker.max === undefined ? null : this.worker.max.toFixed(4);
  }

  get avg(): string {
    return this.worker.avg.toFixed(4);
  }
}
