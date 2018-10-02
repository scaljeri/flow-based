import { Component, forwardRef, OnDestroy, OnInit } from '@angular/core';

import {
  XXL_FLW_UNIT_SERVICE, XxlFlowUnit, XxlFlowUnitState,
  XxlSocket
} from '../../../../projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormGroup } from '@angular/forms';

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
  styleUrls: ['./random-numbers.component.scss'],
  providers: [{
    provide: XXL_FLW_UNIT_SERVICE, useExisting: forwardRef(() => RandomNumbersComponent), multi: true
  }]
})
export class RandomNumbersComponent implements XxlFlowUnit, OnInit, OnDestroy {
  configForm: FormGroup;
  isActive = false;
  id = 0;
  state: XxlFlowUnitState;

  constructor(private fb: FormBuilder) {
  }

  ngOnInit(): void {
    this.configForm = this.fb.group({
      title: [''],
      startValue: [0],
      endValue: [1]
    });

    this.configForm.valueChanges.subscribe(form => {
      console.log(form);
      if (form.startValue > this.configForm.controls.endValue.value) {
        this.configForm.controls.endValue.setValue(form.startValue, { onlySelf: true, emitEvent: true});
      }
    });
  }

  ngOnDestroy(): void {
  }

  setState(state: XxlFlowUnitState): void {
    this.state = state;
  }

  getSockets(): XxlSocket[] {
    return [{
      type: 'in',
      id: 'rnc-a'
    }, {
      type: 'out',
      id: 'rnc-b'
    }, {
      type: 'out',
      id: 'rnc-c'
    }];
  }

  setActive(state: boolean): void {
    this.isActive = state;
  }

  get title(): string {
    return this.configForm.controls.title.value;
  }
}
