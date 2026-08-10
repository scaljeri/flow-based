import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject } from 'rxjs';

export const RANDOM_NUMBER_SETTINGS: FbNodeSettings = {
  title: 'Random number generator',
  help: 'A generator: a new random number every interval, between the start and end you set. The simplest possible source — for demonstrating a stream when the numbers themselves do not matter.',
  /*
   * Behaviour only. The sliders' BOUNDS (0–100, 100–10000ms) used to live
   * here too, which put the settings panel's furniture in every saved flow —
   * the JSON is the shareable artefact, and a reader of it could not tell
   * which four numbers described the node and which described a form.
   * Bounds live in the settings component now; migration 4→5 drops them
   * from saved files.
   */
  config: {
    start: 0,
    end: 1,
    interval: 1000,
    integer: true
  },
  sockets: [
    {
      type: 'out',
      format: 'number'
    }
  ]
};

export class RandomNumbersWorker implements FbNodeWorker {
  private intervalId = 0;
  private subject = new Subject<any>();

  constructor(private config: any) {
    this.initialize();
  }

  destroy(): void {
    clearInterval(this.intervalId);
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  initialize(): void {
    clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      const random = Math.random() * (this.end - this.start) + this.start;

      this.subject.next(this.integer ? Math.round(random) : random);
    }, this.config.interval);

  }

  removeStream(connection: FbConnection): void { /* not used */
  }

  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {  /* not used */
  }

  get start(): number {
    return this.config.start;
  }

  set start(value: number) {
    this.config.start = value;
  }

  get end(): number {
    return this.config.end;
  }

  set end(value: number) {
    this.config.end = value;
  }

  get interval(): number {
    return this.config.interval;
  }

  set interval(val: number) {
    /*
     * Only a CHANGE restarts the timer. The settings form assigns every field
     * on every valueChanges tick, so moving the Start slider used to re-assign
     * the same interval and reset the timer with it — the stream went quiet
     * for a whole period each time any other setting moved.
     */
    if (val === this.config.interval) {
      return;
    }

    this.config.interval = val;
    this.initialize();
  }

  get integer(): boolean {
    // `config.integer`, matching the key RANDOM_NUMBER_SETTINGS actually
    // declares. Reading `config.integers` meant a fresh node saw `undefined`, so
    // the "Integers only" checkbox always started unchecked and values started
    // non-integer, contradicting the declared default of `true`.
    return this.config.integer;
  }

  set integer(val: boolean) {
    this.config.integer = val;
  }

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }
}
