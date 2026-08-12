import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type LogicOp = 'and' | 'or' | 'not';

export interface LogicConfig {
  op?: LogicOp;
}

export const LOGIC_SETTINGS: FbNodeSettings = {
  title: 'Logic',
  help: 'AND / OR / NOT over 0-and-1 signals — the boolean the base shapes describe but no node produced. AND is 1 when every wire is non-zero, OR when any is, NOT flips the first. Add inputs from the panel; out is 0 or 1.',
  config: { op: 'and' },
  sockets: [
    { type: 'in', format: 'number' },
    { type: 'in', format: 'number' },
    { type: 'out', format: 'number' },
  ],
  // AND/OR are n-ary — more terms is more wires, not more nodes.
  addableSockets: 'in',
};

/** Non-zero is true; 0, '', null, undefined are false. */
const truthy = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return value !== 0 && !Number.isNaN(value);
  }

  return !!value;
};

/**
 * Boolean algebra on the wire.
 *
 * The type system ships a boolean base shape, and the controls speak 0/1, but
 * nothing combined them: "below the band AND the trend is down" needed a script.
 * Each incoming wire is a term; AND/OR fold them, NOT negates the one.
 */
export class LogicWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  /** Latest truthiness per WIRE (connection), so a removed wire drops its term. */
  private readonly terms = new Map<number, boolean>();

  result?: number;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: LogicConfig = {}) {
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

  get op(): LogicOp {
    return this.config.op ?? 'and';
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      this.terms.set(connection.id, truthy(value));
      this.recompute();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
    this.terms.delete(connection.id);
    this.recompute();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.recompute();
      this.ticks.next();
    }
  }

  private recompute(): void {
    const values = [...this.terms.values()];

    if (values.length === 0) {
      this.ticks.next();

      return;
    }

    const answer =
      this.op === 'not' ? !values[0]
        : this.op === 'or' ? values.some(Boolean)
          : values.every(Boolean);

    this.result = answer ? 1 : 0;
    this.subject.next(this.result);
    this.ticks.next();
  }
}
