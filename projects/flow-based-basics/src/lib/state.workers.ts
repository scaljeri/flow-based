import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

/*
 * The state primitives: hold, accumulator, unit-delay.
 *
 * Explicit memory cells, because without them state hides inside script
 * nodes where a reader cannot see it. All three are driven by MOMENTS on
 * ordinary wires (a press, a tick — any arriving value), which is what makes
 * feedback and before/after comparison teachable instead of magical.
 */

/** Shared plumbing: a latest value, subscriptions, and a redraw channel. */
abstract class StateWorker implements FbNodeWorker {
  protected readonly subject = new ReplaySubject<unknown>(1);
  protected readonly ticks = new ReplaySubject<void>(1);
  protected readonly subscriptions: Record<number, Subscription> = {};

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  abstract setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void;

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }
}

export const HOLD_SETTINGS: FbNodeSettings = {
  title: 'Hold',
  help: 'Freezes a value on demand. Any moment on \'hold\' latches whatever is flowing now, and holds it until the next latch — \'keep this reading, change the parameter, compare\'.',
  config: {},
  sockets: [
    { type: 'in' },
    // Any arriving value latches — a moment, not a message.
    { type: 'in', name: 'hold', format: 'number' },
    { type: 'out' },
  ],
};

/**
 * Sample-and-hold: freeze a reading on demand.
 *
 * "Hold this, now change the parameter, compare" is a core rhetorical move
 * in a scientific article — Simulink's Memory, Pd's f — and it used to need
 * a script node with hidden state.
 */
export class HoldWorker extends StateWorker {
  /** What is flowing now; undefined until anything arrived. */
  current?: unknown;
  /** What was frozen; undefined until the first latch. */
  held?: unknown;

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if (socket.name === 'hold') {
      this.subscriptions[connection.id] = stream.subscribe(() => this.latch());

      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.current = value;
      this.ticks.next();
    });
  }

  /** Freeze what is flowing now. The node's button and the `hold` input both land here. */
  latch(): void {
    if (this.current === undefined) {
      return;
    }

    this.held = this.current;
    this.subject.next(this.held);
    this.ticks.next();
  }
}

export interface AccumulatorConfig {
  /** What accumulates: the values themselves, or how many arrived. */
  mode?: 'sum' | 'count';
}

export const ACCUMULATOR_SETTINGS: FbNodeSettings = {
  title: 'Accumulator',
  help: 'Adds up what passes through — a running sum, or a count of arrivals. A moment on \'reset\' starts over. The bridge from per-tick values to an evolving quantity.',
  config: { mode: 'sum' },
  sockets: [
    { type: 'in', format: 'number' },
    // Any arriving value resets — a moment.
    { type: 'in', name: 'reset', format: 'number' },
    { type: 'out', format: 'number' },
  ],
};

/**
 * The bridge from per-tick values to an evolving quantity: running sums,
 * counts, integration by small steps — Max's counter, Simulink's Integrator.
 */
export class AccumulatorWorker extends StateWorker {
  total = 0;

  constructor(private readonly config: AccumulatorConfig = {}) {
    super();
  }

  get mode(): 'sum' | 'count' {
    return this.config.mode === 'count' ? 'count' : 'sum';
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if (socket.name === 'reset') {
      this.subscriptions[connection.id] = stream.subscribe(() => this.reset());

      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      const numeric = Number(value);

      // A value that is not a number still COUNTS — arrival is the event —
      // but adds nothing: NaN in a running sum poisons it forever.
      this.total += this.mode === 'count' ? 1 : Number.isNaN(numeric) ? 0 : numeric;
      this.subject.next(this.total);
      this.ticks.next();
    });
  }

  reset(): void {
    this.total = 0;
    this.subject.next(this.total);
    this.ticks.next();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.ticks.next();
    }
  }
}

export const DELAY_SETTINGS: FbNodeSettings = {
  title: 'Unit delay',
  help: 'Emits the PREVIOUS value, one step behind — advanced only by a moment on \'step\'. This is the one legal way to close a feedback loop: clocked, a cycle takes one visible step per tick instead of running away.',
  config: {},
  sockets: [
    { type: 'in' },
    // The beat this delay advances on. Without one it stays silent.
    { type: 'in', name: 'step', format: 'number' },
    { type: 'out' },
  ],
};

/**
 * The previous value — one step behind, where "step" is a wire.
 *
 * This is the one legal way to close a feedback loop: every surveyed system
 * (Simulink's Unit Delay, LabVIEW's shift register) requires a delay element
 * in a cycle, because a cycle without one is a synchronous recursion with no
 * bottom. The step is an EXPLICIT input rather than "every arrival" for the
 * same reason: emitting on arrival inside a cycle produces the next arrival,
 * and the loop runs away the moment it closes. Clocked, a cycle advances one
 * step per tick — visible, boundable, stoppable.
 */
export class DelayWorker extends StateWorker {
  /** What arrived since the last step. */
  current?: unknown;
  /** What the last step stored — the value one step behind. */
  stored?: unknown;

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if (socket.name === 'step') {
      this.subscriptions[connection.id] = stream.subscribe(() => this.step());

      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.current = value;
      this.ticks.next();
    });
  }

  step(): void {
    if (this.stored !== undefined) {
      this.subject.next(this.stored);
    }

    this.stored = this.current;
    this.ticks.next();
  }
}
