import { FbKeyValues, XxlConnection, XxlSocket, FbNodeWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const TAP_SETTINGS = {
  title: 'Tap',
  config: {expanded: false},
  sockets: [
    {
      type: 'in',
    },
    {
      type: 'out'
    }
  ]
};

export class TapWorker implements FbNodeWorker {
  private stream: Observable<any>;
  private subscriptions: { [id: string]: Subscription } = {};
  private subject = new Subject<any>();

  public history: number[] = [];
  public currentValue: any;
  public count = 0;

  constructor() {
  }

  destroy(): void {
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<any>, socket: XxlSocket, connection: XxlConnection): void {
    this.stream = stream;

    this.subscriptions[connection.id] = stream.subscribe((val: number) => {
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

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }
}
