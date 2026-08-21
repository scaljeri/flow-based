import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type StampAs = 'ms' | 's' | 'iso';

export interface TimestampConfig {
  as?: StampAs;
}

export const TIMESTAMP_SETTINGS: FbNodeSettings = {
  title: 'Timestamp',
  help: 'When did this arrive? Every moment that comes in leaves stamped with the wall-clock — epoch milliseconds, seconds, or an ISO string. Live-data flows could not label a reading with its time without a script; drive it from a clock or a request to timestamp each poll.',
  config: { as: 'ms' },
  // Its socket contract is fixed — nothing there is addable.
  addableSockets: 'none',
  sockets: [
    { type: 'in' },
    { type: 'out' },
  ],
};

/**
 * The wall clock, sampled per arrival.
 *
 * Not a source that ticks on its own — a clock or a request already does that.
 * This answers "at what time", stamping each moment that passes through, so a
 * reading can carry when it was taken.
 */
export class TimestampWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  /** For the drawing: the last stamp it produced. */
  reading?: string;

  /** The wall clock; a field, not a ctor arg, so a node ctor stays (config) — pinned in tests. */
  now: () => number = () => Date.now();

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: TimestampConfig = {}) {
    this.ticks.next();
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  get as(): StampAs {
    return this.config.as ?? 'ms';
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(() => this.stamp());
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    // The face's reading described the removed wire's last arrival.
    this.reading = undefined;
    // Announced, or the stale reading stayed on the face.
    this.ticks.next();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.ticks.next();
    }
  }

  private stamp(): void {
    const ms = this.now();
    const value: number | string =
      this.as === 's' ? Math.floor(ms / 1000)
        : this.as === 'iso' ? new Date(ms).toISOString()
          : ms;

    this.reading = String(value);
    this.subject.next(value);
    this.ticks.next();
  }
}
