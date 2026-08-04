import { FbConnection, FbNodeWorker, FbSocket } from '@scaljeri/flow-based';
import { Observable, Subject, Subscription } from 'rxjs';
import { FnValue } from './function-value';

export interface SamplerConfig {
  from?: number;
  to?: number;
  step?: number;
  interval?: number;
}

/**
 * A function in, a time series out.
 *
 * The sampler walks x across [from, to] one step per tick, emitting f(x) as a
 * plain number — which is what turns a FUNCTION, a thing with no time in it,
 * into something a time-series plot can draw. At the end it wraps around, so
 * the shape keeps redrawing as long as anyone watches; a new function on the
 * input restarts the sweep from the left, because half of one curve glued to
 * half of another reads as neither.
 */
export class SamplerWorker implements FbNodeWorker {
  private readonly subject = new Subject<number>();
  private readonly subscriptions: { [id: number]: Subscription } = {};

  private fn?: FnValue;
  private x = 0;
  private timer?: ReturnType<typeof setInterval>;

  /** The latest sample, for the node's own drawing. */
  current?: number;

  constructor(private readonly config: SamplerConfig = {}) {
  }

  destroy(): void {
    clearInterval(this.timer);
    Object.values(this.subscriptions).forEach(s => s.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<FnValue>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.fn = value;
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
    this.x = this.from;

    if (!this.fn) {
      return;
    }

    this.timer = setInterval(() => this.tick(), this.interval);
  }

  private tick(): void {
    if (!this.fn) {
      return;
    }

    try {
      const value = this.fn.evaluate({ x: this.x });

      if (typeof value === 'number' && Number.isFinite(value)) {
        this.current = value;
        this.subject.next(value);
      }
    } catch {
      // A function that fails at this x simply contributes no sample there.
    }

    this.x += this.step;

    if (this.x > this.to) {
      this.x = this.from;
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
}
