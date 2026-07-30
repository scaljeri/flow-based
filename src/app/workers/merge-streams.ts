import { FbKeyValues, FbNodeSettings, FbNodeWorker, XxlConnection, XxlFlowUnitState, XxlSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription, zip } from 'rxjs';
import { map } from 'rxjs/operators';

export const MERGE_STREAMS_SETTINGS: FbNodeSettings = {
  title: 'Merge streams',
  sockets: [
    {
      type: 'in',
      format: 'number'
    },
    {
      type: 'in',
      format: 'number'
    },
    {
      type: 'out',
      format: 'number'
    }
  ]
};

export class MergeStreamsWorker implements FbNodeWorker {
  // Absent until the first stream is connected; every read is already guarded.
  private subscription?: Subscription;
  private subject = new ReplaySubject<number>(1);

  private streams$: { [s: string]: Observable<{ value: number, connection: XxlConnection }> } = {};
  public streamValues: { [key: string]: number[] } = {};
  public outputValue = 0;
  private valuesSubject = new Subject<any>();

  constructor(private state: XxlFlowUnitState) {
  }

  destroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getValues(): Observable<any> {
    return this.valuesSubject.asObservable();
  }

  getStream(): Observable<number> {
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
    const streams$ = ids.map(id => this.streams$[id]);

    if (!ids.length) {
      return;
    }

    this.subscription = zip(...streams$)
      .subscribe(values => {
        this.outputValue = values.reduce((a, b) => a + b.value, 0);
        this.subject.next(this.outputValue);

        const vals = values.reduce((o: { [id: string]: number[] }, v) => {
          const id = v.connection.in!;
          if (!o[id]) {
            o[id] = [];
          }

          o[id].push(v.value);
          return o;
        }, {});
        this.valuesSubject.next(vals);

        // this.streamValues = values.reduce((out, v) => {
        //   if (!out[v.connection.to as number]) {
        //     out[v.connection.to as number] = [];
        //   }
        //
        //   out[v.connection.to as number].push(v.value);
        //
        //   return out;
        // }, {});
      });
  }

  setStream(stream: Observable<number>, socket: XxlSocket, connection: XxlConnection): void {
    this.streams$[connection.id] = stream.pipe(map(v => ({value: v, connection})));
    this.createStream();
  }

  get title(): string | undefined | null {
    return this.state.title;
  }

  connect(conn: XxlConnection, sockets: FbKeyValues<XxlSocket>): void {

  }
}
