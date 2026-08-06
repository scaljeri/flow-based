import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const TAP_SETTINGS: FbNodeSettings = {
  title: 'Tap',
  config: {expanded: false},
  /*
   * Because what arrives here is not always a number. A station list or a grid
   * needs room, and how much room is the reader's call, not the node type's.
   */
  resizable: true,
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

  public history: unknown[] = [];
  public currentValue: unknown;
  public count = 0;

  /*
   * A tap carries whatever is on the wire, and that is not always a number.
   * Two of its readers — the meter's needle and the graph's line — can only
   * draw numbers, so the narrowing happens once, here, rather than at each of
   * them guessing what to do with an object.
   */

  /** The reading, when it is a number. */
  get currentNumber(): number | undefined {
    return typeof this.currentValue === 'number' ? this.currentValue : undefined;
  }

  /** The history with everything unplottable left out. */
  get numbers(): number[] {
    return this.history.filter((entry): entry is number => typeof entry === 'number');
  }

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

    this.subscriptions[connection.id] = stream.subscribe((incoming: unknown) => {
      /*
       * Rounded only when it IS a number. The old test was `!isNaN(val)`, which
       * is also true of the string "3" — and a string has no toFixed, so a
       * text-carrying wire threw inside the subscription and the tap stopped
       * logging. Anything that is not a number is kept exactly as it arrived;
       * the drawings decide how to show it.
       */
      const val = typeof incoming === 'number' && !Number.isInteger(incoming)
        ? parseFloat(incoming.toFixed(2))
        : incoming;

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
