import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject } from 'rxjs';

export const RANDOM_NUMBER_CONFIG = {
  min: 0,
  max: 100,
  start: 0,
  end: 1,
  intervalMax: 10000,
  intervalMin: 100,
  interval: 1000,
  integer: true
};

export class RandomNumbersWorker implements XxlWorker {
  private intervalId: number;
  private subject = new Subject<any>();

  constructor(private config: any) {
    this.initialize();
  }

  destroy(): void {
    clearInterval(this.intervalId);
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  initialize(): void {
    clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      const random = Math.random() * (this.end - this.start) + this.start;
      console.log(random);

      this.subject.next(this.integer ? Math.round(random) : random);
    }, this.config.interval);

  }

  removeStream(connection: XxlConnection): void { /* not used */ }

  setStream(stream: Observable<any>, connection: XxlConnection): void {  /* not used */ }

  get start(): number {
    return this.config.start;
  }

  set start(value: number) {
    this.config.start = value;
  }

  get end(): number {
    return this.config.end;
  }

  set end(value: number) {
    this.config.end = value;
  }

  get min(): number {
    return this.config.min;
  }

  get max(): number {
    return this.config.max;
  }

  get interval(): number {
    return this.config.interval;
  }

  set interval(val) {
    this.config.interval = val;
    this.initialize();
  }

  get intervalMin(): number {
    return this.config.intervalMin;
  }

  get intervalMax(): number {
    return this.config.intervalMax;
  }

  get integer(): boolean {
    return this.config.integers;
  }

  set integer(val: boolean) {
    this.config.integers = val;
  }
}
