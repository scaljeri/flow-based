import { Component, HostBinding, Inject, Input, OnInit } from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {FlowBasedManagerService} from '../../../../projects/flow-based/src/lib/services/flow-based-manager.service';
import { XXL_BLACK_BOX, XxlBlackBox } from 'flow-based';
import { XxlConfig } from '../../../../projects/flow-based/src/lib/flow-based';

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
  start: 0,
  end: 100,
  factory: () => new RandomNumbers()
};

@Component({
  selector: 'fb-random-numbers',
  templateUrl: './random-numbers.component.html',
  styleUrls: ['./random-numbers.component.scss']
})
export class RandomNumbersComponent implements OnInit {
  @Input() @HostBinding('class.is-config') isConfig = false;

  isActive: boolean = false;

  constructor(@Inject(XXL_BLACK_BOX) private state: XxlConfig,
              private fbManager: FlowBasedManagerService) {
  }

  ngOnInit() {
    this.state.active$.subscribe(isActive => {
      console.log('update state ', isActive);
      this.isActive = isActive;
    });
  }
}
