import { Component, forwardRef, HostBinding, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';

import {
  XXL_FLW_UNIT_SERVICE, XxlFlowUnit,
  XxlSocket
} from '../../../../projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

export interface RandomNumberConfig {
  range: { start: number, end: number };
}

/* *** SOURCE / PRODUCER *** */

export class RandomNumbers {
  private output = new Subject<number>();
  private intervalId: number;

  private lower: number;
  private upper: number;

  constructor() {
  }

  set config(config: RandomNumberConfig) {
    this.lower = config.range.start;
    this.upper = config.range.end;
  }

  getOutputFor(name?: string): Observable<number> {
    return this.output.asObservable();
  }

  start(): void {
    this.intervalId = setInterval(() => {
      this.output.next(this.lower + Math.round(Math.random() * (this.upper - this.lower)));
    }, 1000);
  }

  stop(): void {
    clearInterval(this.intervalId);
  }
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
