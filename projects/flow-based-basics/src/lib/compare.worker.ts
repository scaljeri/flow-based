import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { toNumber } from '@scaljeri/flow-based-node-utils';
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
  // A comparison is exactly two inputs and one answer; nothing there is addable.
  addableSockets: 'none',
  // AUX is the operand's machine identity, NAME its display label. The worker
  // routes by aux, so the panel's invitation to rename ("threshold", "price")
  // cannot silently swap the sides — the crypto gate's lesson, applied here.
  sockets: [
    { type: 'in', aux: 'a', name: 'a', format: 'number' },
    // The threshold. Wired, it overrides the config without being saved — the
    // run/url convention every other node here follows.
    { type: 'in', aux: 'b', name: 'b', format: 'number' },
    { type: 'out', format: 'number' },
  ],
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
  // Each wire remembers WHICH side it feeds, so removing one resets that side
  // and only that side — removing `a` used to wipe the wired threshold instead.
  private readonly wires = new Map<number, { side: 'a' | 'b'; subscription: Subscription }>();

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
    this.wires.forEach(wire => wire.subscription.unsubscribe());
    this.wires.clear();
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
    // Routed by AUX — the stable identity — not by the display name a flow may
    // change; name stays as the fallback for flows saved before aux existed.
    const side: 'a' | 'b' = (socket.aux ?? socket.name) === 'b' ? 'b' : 'a';

    const subscription = stream.subscribe(value => {
      if (side === 'b') {
        this.bWired = toNumber(value);
      } else {
        this.a = toNumber(value);
      }

      this.recompute();
    });

    this.wires.set(connection.id, { side, subscription });
  }

  removeStream(connection: FbConnection): void {
    const wire = this.wires.get(connection.id);

    if (!wire) {
      return;
    }

    wire.subscription.unsubscribe();
    this.wires.delete(connection.id);

    // Only the REMOVED side resets: losing `b` falls back to the config
    // threshold, losing `a` returns to "not yet" — it used to keep a stale `a`
    // and wipe the threshold, answering from two values nobody wired.
    if (wire.side === 'b') {
      this.bWired = undefined;
    } else {
      this.a = undefined;
    }

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
    // as a made-up 0 (the same rule the pick node's number shape holds). The
    // last answer clears too — a removed input must not leave a stale verdict.
    if (this.a === undefined) {
      this.result = undefined;
      this.ticks.next();

      return;
    }

    const answer = COMPARE_OPS[this.op].test(this.a, this.b) ? 1 : 0;

    this.result = answer;
    this.subject.next(answer);
    this.ticks.next();
  }
}
