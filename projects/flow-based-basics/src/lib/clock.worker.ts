import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';

export interface ClockConfig {
  /** Milliseconds between ticks; floored at 50 — see `interval`. */
  interval?: number;
  running?: boolean;
}

export const CLOCK_SETTINGS: FbNodeSettings = {
  title: 'Clock',
  config: { interval: 1000, running: true },
  sockets: [
    // 0 pauses, anything else runs. Wired, it overrides the config without
    // being saved — the same convention iterate's `c` and request's `url` use.
    { type: 'in', name: 'run', format: 'number' },
    { type: 'out', format: 'number' },
  ],
};

/**
 * One tick source, instead of a private timer in every producer.
 *
 * Every surveyed live system converges on exactly one clocking primitive —
 * Pd's metro, Node-RED's inject-repeat, Simulink's solver step — because
 * animation, sampling and polling all hang off the same question: when. A
 * moment is a PACKET here (the 2026-08-10 decision): the tick count travels
 * as a plain number, and anything with an input can be driven by it.
 */
export class ClockWorker implements FbNodeWorker {
  private readonly subject = new Subject<number>();
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};
  private timer?: ReturnType<typeof setInterval>;

  /** The wire's say, when there is one; overrides config unsaved. */
  private wired?: boolean;

  /** Monotone, so every tick is distinguishable from the last. */
  count = 0;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: ClockConfig = {}) {
    this.arm();
  }

  destroy(): void {
    clearInterval(this.timer);
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<number> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if (socket.name !== 'run') {
      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.wired = !!value && value !== 0;
      this.arm();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    // The wire's opinion leaves with the wire.
    if (!Object.keys(this.subscriptions).length) {
      this.wired = undefined;
      this.arm();
    }
  }

  get running(): boolean {
    return this.wired ?? this.config.running ?? true;
  }

  /**
   * Floored at 50ms. Zero would spin a CPU core for nothing a reader can
   * see, and a document pill scrubbing through small numbers passes through
   * zero on its way anywhere.
   */
  get interval(): number {
    const raw = Number(this.config.interval);

    // `|| 1000` would treat a configured 0 as absent and quietly run at 1s;
    // 0 means "as fast as allowed", which is the floor.
    return Number.isFinite(raw) ? Math.max(50, raw) : 1000;
  }

  /** The play/pause on the node. A wired `run` outranks it — the wire is data. */
  toggle(): void {
    this.config.running = !this.running;
    this.arm();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.arm();
    }
  }

  private arm(): void {
    clearInterval(this.timer);
    this.timer = undefined;

    if (this.running) {
      this.timer = setInterval(() => {
        this.count++;
        this.subject.next(this.count);
        this.ticks.next();
      }, this.interval);
    }

    this.ticks.next();
  }
}
