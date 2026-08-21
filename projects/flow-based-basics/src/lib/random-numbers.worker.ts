import { FbKeyValues, FbNodeSettings, FbNodeWorker, FbConnection, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';

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
  // ReplaySubject(1): a generated value is a value, and a wire drawn after one
  // was produced would otherwise wait a whole interval to see anything.
  private subject = new ReplaySubject<any>(1);

  constructor(private config: any) {
    this.initialize();
  }

  destroy(): void {
    clearInterval(this.intervalId);
    this.subject.complete();
  }

  /*
   * The announce channel — the engine wraps this, so a write through it marks
   * the flow dirty and reaches the document's pills. The property setters
   * below delegate here; they used to assign config directly, and a panel
   * edit was silently gone on reload.
   */
  setConfigValue(path: string, value: unknown): void {
    if (path === 'interval') {
      /*
       * Only a CHANGE restarts the timer (the settings form assigns every
       * field on every valueChanges tick), and never faster than the clock's
       * floor: a hand-edited interval of 0 span the timer flat out.
       */
      const floored = Math.max(50, Number(value) || 0);

      if (floored === this.config.interval) {
        return;
      }

      this.config.interval = floored;
      this.initialize();

      return;
    }

    writeConfigValue(this.config, path, value);
  }

  getStream(): Observable<any> {
    return this.subject.asObservable();
  }

  initialize(): void {
    clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      const random = Math.random() * (this.end - this.start) + this.start;

      this.subject.next(this.integer ? Math.round(random) : random);
    }, this.interval);

  }

  removeStream(connection: FbConnection): void { /* not used */
  }

  setStream(stream: Observable<any>, socket: FbSocket, connection: FbConnection): void {  /* not used */
  }

  get start(): number {
    return this.config.start;
  }

  set start(value: number) {
    this.setConfigValue('start', value);
  }

  get end(): number {
    return this.config.end;
  }

  set end(value: number) {
    this.setConfigValue('end', value);
  }

  get interval(): number {
    // Floored like the clock: a hand-edited interval of 0 (or a non-number)
    // spun setInterval flat out. initialize() reads THIS, not config directly.
    const raw = Number(this.config.interval);

    return Number.isFinite(raw) ? Math.max(50, raw) : 1000;
  }

  set interval(val: number) {
    this.setConfigValue('interval', val);
  }

  get integer(): boolean {
    // `config.integer`, matching the key RANDOM_NUMBER_SETTINGS actually
    // declares. Reading `config.integers` meant a fresh node saw `undefined`, so
    // the "Integers only" checkbox always started unchecked and values started
    // non-integer, contradicting the declared default of `true`.
    return this.config.integer;
  }

  set integer(val: boolean) {
    this.setConfigValue('integer', val);
  }

  connect(conn: FbConnection, sockets: FbKeyValues<FbSocket>): void {

  }
}
