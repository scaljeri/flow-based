import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
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
  private stream: Observable<any>;
  private subscriptions: { [id: string]: Subscription } = {};
  private subject = new Subject<any>();

  public history = [];
  public currentValue: any;
  public count = 0;

  constructor(private state?: XxlFlowUnitState) {
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
  }

  getSockets(): XxlSocket[] {
    return this.state.config.sockets;
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<any>, connection: XxlConnection): void {
    this.stream = stream;

    this.subscriptions[connection.id] = stream.subscribe(val => {
      this.currentValue = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
      this.count++;

      this.history.unshift(Number.isInteger(val) ? val : parseFloat(val.toFixed(2)));
      this.history = this.history.slice(0, 33);

      this.subject.next(val);
    });
  }

  removeStream(connection: XxlConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }
}
