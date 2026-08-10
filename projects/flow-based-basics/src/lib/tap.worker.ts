import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';

export const TAP_SETTINGS: FbNodeSettings = {
  title: 'Tap',
  help: 'A window onto a wire: it shows the last values passing through and passes them on untouched. Inspection without changing what it inspects.',
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
       * Passed on exactly as it arrived. An observer must not change what it
       * observes: this used to round non-integer numbers to two decimals on
       * the way THROUGH, so a tap between a formula and a plot changed the
       * plot. Rounding is the drawings' job — see TapView.label. (An earlier
       * version also called toFixed on anything `!isNaN`, which is true of the
       * string "3" too, and a text-carrying wire threw mid-subscription.)
       */
      this.currentValue = incoming;
      this.count++;

      this.history.unshift(incoming);
      this.history = this.history.slice(0, 33);
      this.subject.next(incoming);
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id].unsubscribe();

    delete this.subscriptions[connection.id];
  }

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }
}
