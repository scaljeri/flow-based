import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const TAP_SETTINGS: FbNodeSettings = {
  title: 'Tap',
  // A logger with nothing on screen is not a logger. This is the one node type
  // whose whole purpose is the value it displays, so it opens showing it.
  defaultView: 'medium',
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
  private stream!: Observable<any>;
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

  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {
    this.stream = stream;

    this.subscriptions[connection.id] = stream.subscribe((val: number) => {
      if (!isNaN(val)) {
        val = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
      }

      this.currentValue = val;
      this.count++;

      this.history.unshift(val);
      this.history = this.history.slice(0, 33);
      this.subject.next(val);
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }
}
