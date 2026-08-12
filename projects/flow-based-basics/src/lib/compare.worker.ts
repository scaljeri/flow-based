import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type CompareOp = 'gt' | 'lt' | 'ge' | 'le' | 'eq' | 'ne';

export interface CompareConfig {
  op?: CompareOp;
  /** The threshold, when nothing is wired into `b`. */
  b?: number;
}

/** Symbol and test for each operator, in the order the settings list them. */
export const COMPARE_OPS: Record<CompareOp, { symbol: string; test: (a: number, b: number) => boolean }> = {
  gt: { symbol: '>', test: (a, b) => a > b },
  lt: { symbol: '<', test: (a, b) => a < b },
  ge: { symbol: '≥', test: (a, b) => a >= b },
  le: { symbol: '≤', test: (a, b) => a <= b },
  eq: { symbol: '=', test: (a, b) => a === b },
  ne: { symbol: '≠', test: (a, b) => a !== b },
};

export const COMPARE_SETTINGS: FbNodeSettings = {
  title: 'Compare',
  help: 'Turns a condition into a 0 or a 1 — the one thing the palette could not do, so a gate or an on/off light had no honest way to be driven. `a` against `b` (`b` is a config, or wire it), operator picked in the panel; out is 1 when it holds, 0 when it does not.',
  config: { op: 'gt', b: 0 },
  sockets: [
    { type: 'in', name: 'a', format: 'number' },
    // The threshold. Wired, it overrides the config without being saved — the
    // run/url convention every other node here follows.
    { type: 'in', name: 'b', format: 'number' },
    { type: 'out', format: 'number' },
  ],
};

const toNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
      : NaN;

  return Number.isFinite(n) ? n : undefined;
};

/**
 * A condition, as a number.
 *
 * The controls in this palette (gate, the on/off light, the if-style flows)
 * CONSUME a 0 or a 1 but nothing PRODUCED one from a comparison — you reached
 * for the script node for "price below the band". This is that node: two numbers
 * and an operator, out 0 or 1.
 */
export class CompareWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private a?: number;
  private bWired?: number;

  /** For the drawing: the last answer, and the operator on show. */
  result?: number;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: CompareConfig = {}) {
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

  get op(): CompareOp {
    return this.config.op ?? 'gt';
  }

  get symbol(): string {
    return COMPARE_OPS[this.op].symbol;
  }

  /** The threshold in force: a wired `b` outranks the config, like every node here. */
  get b(): number {
    return this.bWired ?? this.config.b ?? 0;
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    if (socket.name === 'b') {
      this.subscriptions[connection.id] = stream.subscribe(value => {
        this.bWired = toNumber(value);
        this.recompute();
      });

      return;
    }

    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.a = toNumber(value);
      this.recompute();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    // Losing the b wire falls back to the config threshold.
    this.bWired = undefined;
    this.recompute();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.recompute();
      this.ticks.next();
    }
  }

  private recompute(): void {
    // Needs a left-hand value; a non-number in is refused rather than compared
    // as a made-up 0 (the same rule the pick node's number shape holds).
    if (this.a === undefined) {
      this.ticks.next();

      return;
    }

    const answer = COMPARE_OPS[this.op].test(this.a, this.b) ? 1 : 0;

    this.result = answer;
    this.subject.next(answer);
    this.ticks.next();
  }
}
