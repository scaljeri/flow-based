import { FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';

export interface ValueConfig {
  /**
   * The parameter's name, when this value IS one: a named value inside a
   * subflow is that subflow's parameter, reachable from outside as
   * `params.<name>` — see the engine's FlowWorker. A plain value node on a
   * canvas needs no name.
   */
  name?: string;
  /** What travels: a number or a piece of text. */
  kind?: 'number' | 'string';
  value?: number | string;
  /**
   * The knob's range and step, for a number.
   *
   * These are behaviour, not panel furniture (contrast random-numbers, whose
   * slider bounds were evicted from config): the author DESIGNS the range a
   * reader may scrub through — a probability gets 0..1 step 0.01, an angle
   * 0..360 — and the node's own drawing and a document's inline pill both
   * honour it.
   */
  min?: number;
  max?: number;
  step?: number;
  /** What the knob is called on the canvas; empty shows nothing. */
  label?: string;
}

export const VALUE_SETTINGS: FbNodeSettings = {
  title: 'Value',
  help: 'A constant with a handle on it — a number (with a slider) or a piece of text. The reader\'s knob: any input downstream becomes tunable, and a document pill can drive it. What a computation depends on, shown on the canvas.',
  config: { kind: 'number', value: 0, min: 0, max: 100, step: 1, label: '' },
  sockets: [{ type: 'out', format: 'number' }],
};

/**
 * A constant with a handle on it: the most universal source there is.
 *
 * Every surveyed editor ships one — LiteGraph's const, Simulink's Constant,
 * Observable's Inputs.range — and this palette lacked it: a document could
 * only scrub nodes whose worker happened to implement setConfigValue, so
 * "make this article interactive" meant "find a tunable worker". A value
 * node makes any downstream input pill-bindable, and puts what a
 * computation depends on ON the canvas instead of buried in config.
 */
export class ValueWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);

  /** Told about anything the node should redraw for. */
  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: ValueConfig = {}, private readonly sockets?: FbSocket[]) {
    this.declareOutput();
    this.emit();
  }

  destroy(): void {
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  // A source: nothing comes in.
  setStream(): void {
  }

  removeStream(): void {
  }

  get kind(): 'number' | 'string' {
    return this.config.kind === 'string' ? 'string' : 'number';
  }

  /** The current value in the declared kind, or undefined when it is not one. */
  get value(): number | string | undefined {
    if (this.kind === 'string') {
      return this.config.value === undefined ? '' : String(this.config.value);
    }

    // A cleared field is "nothing yet", not zero: Number('') is 0, which broke
    // the promise (a few lines down) that unparseable input stays silent.
    if (this.config.value === undefined || this.config.value === null
      || (typeof this.config.value === 'string' && this.config.value.trim() === '')) {
      return undefined;
    }

    const numeric = Number(this.config.value);

    return Number.isFinite(numeric) ? numeric : undefined;
  }

  get min(): number {
    return this.config.min ?? 0;
  }

  get max(): number {
    return this.config.max ?? 100;
  }

  get step(): number {
    return this.config.step || 1;
  }

  get label(): string {
    // A parameter's name is its label unless the author says otherwise.
    return this.config.label || this.config.name || '';
  }

  /**
   * Sugar over setConfigValue — the HOUSE RULE for every mutator. A direct
   * config assignment is invisible to the engine's announce wrap: sliding the
   * slider never marked the flow dirty, and the edit was gone on reload.
   */
  set(value: number | string): void {
    this.setConfigValue('value', value);
  }

  read(key: keyof ValueConfig): string {
    const value = this.config[key];

    return value === undefined || value === null ? '' : String(value);
  }

  write(key: keyof ValueConfig, value: string | number): void {
    this.setConfigValue(key, value);
  }

  /** Tunable from a document — that is this node's whole reason to exist. */
  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.declareOutput();
      this.emit();
    }
  }

  /** The socket's type is a promise made from config, before any data has. */
  private declareOutput(): void {
    const out = this.sockets?.find(socket => socket.type === 'out');

    if (!out) {
      return;
    }

    out.formats = [this.kind];
    out.format = this.kind;
  }

  private emit(): void {
    this.ticks.next();

    const value = this.value;

    // An unparseable number is silence, not NaN: NaN on a wire poisons every
    // computation downstream, and the node's drawing says what is wrong.
    if (value !== undefined) {
      this.subject.next(value);
    }
  }
}
