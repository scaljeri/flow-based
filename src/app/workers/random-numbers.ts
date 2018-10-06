import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject } from 'rxjs';

export const RANDOM_NUMBER_CONFIR = {
  sockets: [
    {
      type: 'out',
      id: 'rnc-a'
    }
  ],
  min: 0,
  max: 100,
  start: 0,
  end: 1
};

export class RandomNumbersWorker implements XxlWorker {
  private interval: number;
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

  removeStream(connection: XxlConnection): void {
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
  }

  initialize(): void {
    clearInterval(this.interval);

    this.interval = setInterval(() => {
      const random = Math.random() * (this.end - this.start) + this.start;

      this.subject.next(random);
    }, 1000);

  }

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
    return this.state.config.min;
  }
}
