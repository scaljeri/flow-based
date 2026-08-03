import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbNodeState, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription, zip } from 'rxjs';
import { map } from 'rxjs/operators';

export const MERGE_STREAMS_SETTINGS: FbNodeSettings = {
  title: 'Merge streams',
  /*
   * No full view.
   *
   * This node draws its own lines between its own elements — socket to card,
   * card to output — and those are MEASURED, not computed from the graph. On the
   * whole surface the cards land hundreds of pixels from the sockets they belong
   * to, which are pinned to the editor's edges, so every line became a long
   * sweep across an empty middle. What it has to show fits in a panel.
   */
  views: ['small', 'normal'],
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

  private streams$: { [s: string]: Observable<{ value: number, connection: FbConnection }> } = {};
  public streamValues: { [key: string]: number[] } = {};
  public outputValue = 0;
  private valuesSubject = new Subject<any>();

  constructor(private state: FbNodeState) {
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

  getSockets(): FbSocket[] {
    return this.state.sockets || this.state.config.sockets;
  }

  removeStream(connection: FbConnection): void { /* not used */
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

  setStream(stream: Observable<number>, socket: FbSocket, connection: FbConnection): void {
    this.streams$[connection.id] = stream.pipe(map(v => ({value: v, connection})));
    this.createStream();
  }

  get title(): string | undefined | null {
    return this.state.title;
  }

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }
}
