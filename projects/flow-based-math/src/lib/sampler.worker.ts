import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FnValue } from './function-value';
import { FnResult, compileExpression } from './formula.worker';

export type SamplerMode = 'point' | 'sweep';

export interface SamplerConfig {
  from?: number;
  to?: number;
  step?: number;
  interval?: number;
  /** 'point': one [x, y] per tick. 'sweep': the whole sweep as one array. */
  mode?: SamplerMode;
  /**
   * Which of from/to/step the USER has set. An untouched field follows the
   * function's declared domain — the formula supplies defaults, nothing
   * more — while a touched one is the user's answer and stays theirs.
   */
  touched?: { from?: boolean; to?: boolean; step?: boolean };
}

/** One sample: the coordinates, however many dimensions there are. */
export type SamplePoint = number[];

/** The labels message a plot listens for between the points. */
export interface SampleLabels {
  labels: { title?: string; x?: string; y?: string };
}

/**
 * A function in, samples out — as POINTS, because a sample without its x is
 * half a fact: a plot fed bare y's could only draw them against arrival
 * order, which turned every sweep's wrap-around into a sawtooth cliff.
 *
 * Two modes. 'point' walks x across [from, to] one step per tick, emitting
 * [x, f(x)] each time — the function unfolds live, and wraps to keep
 * unfolding. 'sweep' computes the whole [from, to] in one go and emits a
 * single array of points — the function as a THING, delivered at once, again
 * whenever the function or the settings change.
 */
export class SamplerWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<SamplePoint | SamplePoint[] | SampleLabels>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  private fn?: FnValue;
  private evaluate?: (x: number) => FnResult;
  private x = 0;
  private timer?: ReturnType<typeof setInterval>;

  /** The latest sample's y, for the node's own drawing. */
  current?: number;

  constructor(private readonly config: SamplerConfig = {}) {
  }

  /*
   * No setConfigValue here, deliberately: every document input today targets
   * the formula, whose re-emit already reaches this sampler over the wire.
   * Whoever adds it must make a write to from/to/step also set the matching
   * `touched` flag — without that, the next formula emit treats the written
   * value as an untouched default and silently reverts it.
   */

  destroy(): void {
    clearInterval(this.timer);
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<SamplePoint | SamplePoint[] | SampleLabels> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<FnValue>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.fn = value;

      // The wire carries data only; running the function is our own job.
      try {
        this.evaluate = compileExpression(value);
      } catch {
        this.evaluate = undefined;
      }

      /*
       * The function's declared domain fills every field the user has not
       * touched — the formula supplies DEFAULTS, and a default keeps
       * following its source. A field the user set is theirs and stays
       * theirs, whatever the formula later declares.
       */
      if (value.xRange) {
        for (const key of ['from', 'to', 'step'] as const) {
          if (!this.config.touched?.[key]) {
            this.config[key] = value.xRange[key];
          }
        }
      }

      this.restart();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Called by the settings panel too: new bounds mean a new sweep. */
  restart(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.x = this.from;

    if (!this.fn) {
      return;
    }

    if (this.fn.labels) {
      this.subject.next({ labels: this.fn.labels });
    }

    if (this.mode === 'sweep') {
      this.emitSweep();
    } else {
      this.timer = setInterval(() => this.tick(), this.interval);
    }
  }

  private tick(): void {
    const point = this.sampleAt(this.x);

    if (point) {
      this.current = point[1];
      this.subject.next(point);
    }

    this.x += this.step;

    if (this.x > this.to) {
      this.x = this.from;

      /*
       * Re-announced at every wrap: the stream replays only its LAST value,
       * so a plot wired up mid-sweep missed the labels sent at the start —
       * one sweep later it has them.
       */
      if (this.fn?.labels) {
        this.subject.next({ labels: this.fn.labels });
      }
    }
  }

  private emitSweep(): void {
    const points: SamplePoint[] = [];

    for (let x = this.from; x <= this.to + 1e-9; x += this.step) {
      const point = this.sampleAt(x);

      if (point) {
        points.push(point);
      }
    }

    if (points.length) {
      this.current = points[points.length - 1][1];
      this.subject.next(points);
    }
  }

  private sampleAt(x: number): SamplePoint | null {
    if (!this.evaluate) {
      return null;
    }

    try {
      const value = this.evaluate(x);

      if (typeof value === 'number') {
        return Number.isFinite(value) ? [x, value] : null;
      }

      // A complex result is a sample with one more dimension: [x, re, im].
      if (value && Number.isFinite(value.re) && Number.isFinite(value.im)) {
        return [x, value.re, value.im];
      }

      return null;
    } catch {
      // A function that fails at this x simply contributes no sample there.
      return null;
    }
  }

  get from(): number {
    return this.config.from ?? 0;
  }

  get to(): number {
    return this.config.to ?? 10;
  }

  get step(): number {
    // Guarded: a zero or negative step would sweep nowhere forever.
    return Math.max(0.001, this.config.step ?? 0.1);
  }

  get interval(): number {
    return Math.max(16, this.config.interval ?? 50);
  }

  get mode(): SamplerMode {
    return this.config.mode ?? 'point';
  }
}
