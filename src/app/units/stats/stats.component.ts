import { Component, Host, HostBinding, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { StatsWorker } from '../../workers/stats';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket } from 'flow-based';

@Component({
  selector: 'fb-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements XxlFlowUnit, OnInit {
  public worker: StatsWorker;
  private state: XxlFlowUnitState;

  @HostBinding('class.is-active') isActive = false;

  constructor(private fb: FormBuilder,
              private flowService: XxlFlowBasedService,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  ngOnInit(): void {
    this.worker = this.flowService.getWorker(this.state.id) as StatsWorker;
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
}
