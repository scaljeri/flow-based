import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FnValue } from './function-value';

export type SamplerMode = 'point' | 'sweep';

export interface SamplerConfig {
  from?: number;
  to?: number;
  step?: number;
  interval?: number;
  /** 'point': one [x, y] per tick. 'sweep': the whole sweep as one array. */
  mode?: SamplerMode;
}

/** One sample: the coordinates, however many dimensions there are. */
export type SamplePoint = number[];

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
  private readonly subject = new ReplaySubject<SamplePoint | SamplePoint[]>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  private fn?: FnValue;
  private x = 0;
  private timer?: ReturnType<typeof setInterval>;
  private adoptedRange?: string;

  /** The latest sample's y, for the node's own drawing. */
  current?: number;

  constructor(private readonly config: SamplerConfig = {}) {
  }

  destroy(): void {
    clearInterval(this.timer);
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<SamplePoint | SamplePoint[]> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<FnValue>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.fn = value;

      /*
       * A function that declares its own domain fills the sampler's settings —
       * that is what makes "this one is interesting from -5 to 5" travel with
       * the function. Adopted only when the DECLARATION changes, so the user's
       * own tweaks survive a formula edit that left the domain alone.
       */
      const declared = value.xRange && JSON.stringify(value.xRange);

      if (declared && declared !== this.adoptedRange) {
        this.adoptedRange = declared;
        Object.assign(this.config, value.xRange);
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
    try {
      const value = this.fn!.evaluate({ x });

      return typeof value === 'number' && Number.isFinite(value) ? [x, value] : null;
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
