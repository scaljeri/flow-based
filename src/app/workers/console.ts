import { XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const CONSOLE_CONFIG = {
  sockets: [{
    type: 'in',
    id: 'csl-a'
  },
    {
      type: 'out',
      id: 'csl-b'
    }]
};

export class ConsoleWorker implements XxlWorker {
  private subscriptions: { [id: string]: Subscription } = {};
  private subjects: { [id: string]: Subject<any> } = {};

  public currentValue: any;

  constructor(private state?: XxlFlowUnitState) {
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
  }

  getSockets(): XxlSocket[] {
    return this.state.config.sockets;
  }

  getStream(id: string) {
    if (!this.subjects[id]) {
      this.subjects[id] = new Subject<any>();
    }

    return this.subjects[id].asObservable();
  }

  setStream(stream: Observable<any>, id: string): void {
    this.subscriptions[id] = stream.subscribe(val => this.receivedValue(val, id));
  }

  removeStream(id: string): void {
    this.subscriptions[id].unsubscribe();

    delete this.subscriptions[id];
  }

  private receivedValue(val: any, id: string): void {
    console.log(val);
    this.currentValue = val;

    if (this.subjects[id]) {
      this.subjects[id].next(val);
    }
  }
}
