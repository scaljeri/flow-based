import { XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject } from 'rxjs';

export const RANDOM_NUMBER_CONFIR = {
  sockets: [
    {
      type: 'in',
      id: 'rnc-a'
    }, {
      type: 'out',
      id: 'rnc-b'
    }, {
      type: 'out',
      id: 'rnc-c'
    }
  ]
};

export class RandomNumbersWorker implements XxlWorker {
  private readonly interval: number;
  private subject = new Subject<any>();

  constructor(private state: XxlFlowUnitState) {
    this.interval = setInterval(() => {
      this.subject.next(Math.random());
    }, 10000);
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

  removeStream(id: string): void {
  }

  setStream(stream: Observable<any>, id?: string): void {
  }
}
