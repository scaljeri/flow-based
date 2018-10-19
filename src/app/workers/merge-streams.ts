import { XxlConnection, XxlFlowUnitState, XxlSocket, XxlWorker } from '../../../projects/flow-based/src/lib/flow-based';
import { Observable, ReplaySubject, Subscription, zip } from 'rxjs';
import { map } from 'rxjs/operators';

export const MERGE_STREAMS_CONFIG = {
  sockets: [
    {
      type: 'in',
      id: 'ms-a',
    },
    {
      type: 'in',
      id: 'ms-b',
    },
    {
      type: 'out',
      id: 'ms-c',
      name: 'Min value',
    }
  ],
};

export class MergeStreamsWorker implements XxlWorker {
  private subscription: Subscription;
  private subject = new ReplaySubject<number>(1);

  private streams$: { [s: string]: Observable<{ value: number, connection: XxlConnection }> } = {};
  public streamValues: { [key: string]: number[] } = {};
  public outputValue: number;

  constructor(private state: XxlFlowUnitState) {
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }

  getStream(id: number): Observable<number> {
    return this.subject.asObservable();
  }

  getSockets(): XxlSocket[] {
    return this.state.sockets || this.state.config.sockets;
  }

  removeStream(connection: XxlConnection): void { /* not used */
    delete this.streams$[connection.id];

    this.createStream();
  }

  createStream(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    const ids = Object.keys(this.streams$);
    const streams$ = ids.reduce((out, item) => {
      out.push(this.streams$[item]);

      return out;
    }, []);

    if (!ids.length) {
      return;
    }

    this.subscription = zip(...streams$)
      .subscribe((values: {value: number, connection: XxlConnection}[]) => {
        this.outputValue = values.reduce((a, b) => a + b.value, 0);
        this.subject.next(this.outputValue);

        this.streamValues = values.reduce((out, v) => {
          if (!out[v.connection.in]) {
            out[v.connection.in] = [];
          }

          out[v.connection.in].push(v.value);

          return out;
        }, {});
      });
  }

  setStream(stream: Observable<number>, connection: XxlConnection): void {
    this.streams$[connection.id] = stream.pipe(map(v => ({value: v, connection})));
    this.createStream();
  }

  get title(): string {
    return this.state.config.title;
  }
}