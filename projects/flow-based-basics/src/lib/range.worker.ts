import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { toNumber } from '@scaljeri/flow-based-node-utils';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export interface RangeConfig {
  /** The interval a value arrives in… */
  fromA?: number;
  fromB?: number;
  /** …and the interval it leaves in. */
  toA?: number;
  toB?: number;
  /** Keep the answer inside the target interval, even when the input strays. */
  clamp?: boolean;
}

/**
 * Map a number from one interval onto another.
 *
 * The commonest glue in every dataflow tool that draws things — Max calls it
 * scale, Node-RED range, Blender Map Range — because a slider's 0..100
 * rarely matches a formula's domain, and a reading rarely matches a plot's.
 * Without it, a one-line rescale becomes a script node: an opaque code blob
 * in a published article where this node reads as a sentence.
 */
export class RangeWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<number>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  /** The latest mapping, for the node's own drawing. */
  latest?: { in: number; out: number };

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: RangeConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const numeric = toNumber(value);

      // Blank is "nothing yet" (Number('') is 0) and Infinity passed the old
      // NaN-only check straight through to downstream with clamp off.
      if (numeric === undefined) {
        return;
      }

      const out = this.map(numeric);

      this.latest = { in: numeric, out };
      this.subject.next(out);
      this.ticks.next();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get fromA(): number {
    return this.config.fromA ?? 0;
  }

  get fromB(): number {
    return this.config.fromB ?? 1;
  }

  get toA(): number {
    return this.config.toA ?? 0;
  }

  get toB(): number {
    return this.config.toB ?? 100;
  }

  get clamp(): boolean {
    return this.config.clamp ?? true;
  }

  read(key: keyof RangeConfig): string {
    const value = this.config[key];

    return value === undefined || value === null ? '' : String(value);
  }

  write(key: keyof RangeConfig, value: number | boolean): void {
    // Sugar over setConfigValue — the engine's announce wrap sees only that.
    this.setConfigValue(key, value);
  }

  /** Tunable from a document: an article can scrub the target interval. */
  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.replay();
    }
  }

  private map(value: number): number {
    // An empty source interval has no sensible position in it; the target's
    // start is the one honest answer that is still a number.
    const span = this.fromB - this.fromA;
    const position = span === 0 ? 0 : (value - this.fromA) / span;
    const mapped = this.toA + position * (this.toB - this.toA);

    if (!this.clamp) {
      return mapped;
    }

    const lo = Math.min(this.toA, this.toB);
    const hi = Math.max(this.toA, this.toB);

    return Math.max(lo, Math.min(hi, mapped));
  }

  /** A moved interval re-answers the last question. */
  private replay(): void {
    if (this.latest) {
      const out = this.map(this.latest.in);

      this.latest = { in: this.latest.in, out };
      this.subject.next(out);
    }

    this.ticks.next();
  }
}
