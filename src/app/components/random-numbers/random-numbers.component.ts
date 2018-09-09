import { Component, forwardRef, HostBinding, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';

import {
  XXL_FLW_UNIT_SERVICE, XxlFlowUnit,
  XxlSocket
} from '../../../../projects/flow-based/src/lib/flow-based';
import { FormControl } from '@angular/forms';

export interface RandomNumberConfig {
  range: { start: number, end: number };
}

/* *** SOURCE / PRODUCER *** */

export class RandomNumbers {
  private output = new Subject<number>();
  private intervalId: number;

  private lower: number;
  private upper: number;

  constructor() {}

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

  stop(): void  {
    clearInterval(this.intervalId);
  }
}

export const RANDOM_NUMBERS_CONFIG = {
  sockets: [
  ],
  start: 0,
  end: 100,
};

let count = 0;

@Component({
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss'],
  providers: [{
    provide: XXL_FLW_UNIT_SERVICE, useExisting: forwardRef(() => RandomNumbersComponent), multi: true
  }]
})
export class RandomNumbersComponent  implements XxlFlowUnit, OnInit, OnDestroy {
  @Input() @HostBinding('class.is-config') isConfig = false;

  name = new FormControl('');
  isActive = false;
  id = 0;
  subscription: Subscription;

  constructor() {
    this.id = ++count;
    console.log('new RN ' + this.id);
  }

  ngOnInit(): void {
    // this.state.active$.subscribe(isActive => {
    //   console.log('update state ', isActive);
    //   this.isActive = isActive;
    // });
    //
    // this.subscription = this.isActive$.subscribe((x) => {
    //   console.log(this.id + ' rn: ' + x);
    // });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getSockets(): XxlSocket[] {
    return [];
  }

  setActive(state: boolean): void {
    console.log('state = ' + state);
    this.isActive = state;
  }
}
