import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type DeferMode = 'debounce' | 'throttle' | 'delay';

export interface DeferConfig {
  mode?: DeferMode;
  ms?: number;
}

export const DEFER_SETTINGS: FbNodeSettings = {
  title: 'Defer',
  help: 'Hold a fast feed back in time. Debounce waits for a pause then emits the last value; throttle lets one through then ignores the rest for a while; delay passes everything, later. Untyped — it holds whatever is on the wire. Nothing debounced or throttled a feed without a script setTimeout before.',
  config: { mode: 'debounce', ms: 200 },
  // Its socket contract is fixed — nothing there is addable.
  addableSockets: 'none',
  sockets: [
    { type: 'in' },
    { type: 'out' },
  ],
};

/**
 * The three ways to slow a stream down.
 *
 * Sample-based delay (`unit-delay`) shifts by ONE arrival; this shifts by TIME.
 * A live price arriving many times a second, a resize firing per pixel — a flow
 * had no node to calm them, only a script's setTimeout.
 */
export class DeferWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private latest?: { value: unknown };
  private throttleUntil = 0;

  /** The wall clock; a field, not a ctor arg, so a node ctor stays (config) — pinned in tests. */
  now: () => number = () => Date.now();

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: DeferConfig = {}) {
    this.ticks.next();
  }

  destroy(): void {
    clearTimeout(this.debounceTimer);
    this.delayTimers.forEach(timer => clearTimeout(timer));
    this.delayTimers.clear();
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  get mode(): DeferMode {
    return this.config.mode ?? 'debounce';
  }

  get ms(): number {
    return Math.max(0, this.config.ms ?? 200);
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => this.arrive(value));
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.ticks.next();
    }
  }

  private arrive(value: unknown): void {
    if (this.mode === 'debounce') {
      this.latest = { value };
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (this.latest) {
          this.emit(this.latest.value);
        }
      }, this.ms);

      return;
    }

    if (this.mode === 'throttle') {
      const now = this.now();

      // Leading: the first through goes at once, then the gate is shut for `ms`.
      if (now >= this.throttleUntil) {
        this.throttleUntil = now + this.ms;
        this.emit(value);
      }

      return;
    }

    // delay: everything passes, each held back by `ms`. Tracked, so destroy()
    // can cancel what is still in the air — an untracked timeout outlived the
    // node by up to `ms`, firing into a completed subject.
    const timer = setTimeout(() => {
      this.delayTimers.delete(timer);
      this.emit(value);
    }, this.ms);

    this.delayTimers.add(timer);
  }

  private readonly delayTimers = new Set<ReturnType<typeof setTimeout>>();

  private emit(value: unknown): void {
    this.subject.next(value);
    this.ticks.next();
  }
}
