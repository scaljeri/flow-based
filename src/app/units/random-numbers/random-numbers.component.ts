import { Component, Host, Inject, OnDestroy, OnInit } from '@angular/core';

import {
  XXL_FLOW_UNIT_STATE,
  XXL_FLOW_UNIT_SERVICE, XxlFlowUnit, XxlFlowUnitState,
  XxlSocket
} from '../../../../projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RandomNumbersWorker } from '../../workers/random-numbers';
import { XxlFlowBasedService } from '../../../../projects/flow-based/src/lib/flow-based.service';
import { FlowUnitComponent } from '../../../../projects/flow-based/src/lib/flow-unit/flow-unit.component';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';

export interface RandomNumberConfig {
  range: { start: number, end: number };
}

export const RANDOM_NUMBERS_CONFIG = {
  sockets: [],
  start: 0,
  end: 100,
};

@Component({
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss']
})
export class RandomNumbersComponent implements XxlFlowUnit, OnInit, OnDestroy {
  private worker: RandomNumbersWorker;
  configForm: FormGroup;
  isActive = false;
  state: XxlFlowUnitState;

  constructor(private fb: FormBuilder,
              private flowService: XxlFlowBasedService,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  ngOnInit(): void {
    this.worker = this.flowService.getWorker(this.state.id) as RandomNumbersWorker;

    this.configForm = this.fb.group({
      startValue: [this.worker.start],
      endValue: [this.worker.end]
    });

    this.configForm.valueChanges.subscribe(form => {
      if (form.startValue > this.configForm.controls.endValue.value) {
        this.configForm.controls.endValue.setValue(form.startValue, {onlySelf: true, emitEvent: true});
      }

      setTimeout(() => {
        this.worker.start = form.startValue;
        this.worker.end = form.endValue;
      });
    });
  }

  ngOnDestroy(): void {
  }

  setActive(state: boolean): void {
    this.isActive = state;
  }

  get title(): string {
    return this.state.title;
  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }

  delete(): void {
    this.flowService.delete(this.state);
  }

  close(): void {
    this.flowService.close(this.state);
  }
}
