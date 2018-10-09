import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject } from 'rxjs';

export const RANDOM_NUMBER_CONFIG = {
  sockets: [
    {
      type: 'out',
      id: 'rnc-a'
    }
  ],
  min: 0,
  max: 100,
  start: 0,
  end: 1,
  intervalMax: 10000,
  intervalMin: 100,
  interval: 1000
};

export class RandomNumbersWorker implements XxlWorker {
  private intervalId: number;
  private subject = new Subject<any>();

  constructor(private state: XxlFlowUnitState) {
    this.initialize();
  }

  destroy(): void {
    clearInterval(this.interval);
  }

  getStream(id: string): Observable<any> {
    return this.subject.asObservable();
  }

  getSockets(): XxlSocket[] {
    return this.state.config.sockets;
  }

  initialize(): void {
    clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      const random = Math.random() * (this.end - this.start) + this.start;

      this.subject.next(random);
    }, this.state.config.interval);

  }

  removeStream(connection: XxlConnection): void { /* not used */ }

  setStream(stream: Observable<any>, connection: XxlConnection): void {  /* not used */ }

  get start(): number {
    return this.state.config.start;
  }

  set start(value: number) {
    this.state.config.start = value;
  }

  get end(): number {
    return this.state.config.end;
  }

  set end(value: number) {
    this.state.config.end = value;
  }

  get min(): number {
    return this.state.config.min;
  }

  get max(): number {
    return this.state.config.max;
  }

  get interval(): number {
    return this.state.config.interval;
  }

  set interval(val) {
    this.state.config.interval = val;
    this.initialize();
  }

  get intervalMin(): number {
    return this.state.config.intervalMin;
  }

  get intervalMax(): number {
    return this.state.config.intervalMax;
  }
}
