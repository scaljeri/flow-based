import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { isEnvelope, unwrap } from './envelope';

export type AggregateOp = 'sum' | 'mean' | 'min' | 'max' | 'count';

export interface AggregateConfig {
  /** Path to group BY within each item; blank folds the whole list to one number. */
  key?: string;
  /** Path to the number being folded; blank counts (or folds the item itself). */
  value?: string;
  op?: AggregateOp;
}

const toNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(n) ? n : undefined;
};

const fold = (op: AggregateOp, values: number[]): number => {
  if (op === 'count') {
    return values.length;
  }

  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((a, b) => a + b, 0);

  return op === 'sum' ? sum
    : op === 'min' ? Math.min(...values)
      : op === 'max' ? Math.max(...values)
        : sum / values.length;   // mean
};

/**
 * Total per category, mean per station — the data-story question.
 *
 * "Sum sales by region", "mean PM2.5 per station": grouping and reducing is the
 * commonest thing a spreadsheet does and the editor could not, so a reader
 * reached for a script. With a key it emits one row per group; without one it
 * folds the whole list to a single number.
 */
export class AggregateWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  error: string | null = null;
  groups = 0;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: AggregateConfig = {}) {
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

  get op(): AggregateOp {
    return this.config.op ?? 'sum';
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => this.aggregate(value));
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

  private numberOf(item: unknown): number | undefined {
    if (this.op === 'count') {
      return 1;   // any item counts as one
    }

    const raw = this.config.value ? readConfigValue(item, this.config.value) : item;

    return toNumber(raw);
  }

  private aggregate(value: unknown): void {
    this.error = null;
    const source = isEnvelope(value) ? unwrap(value) : value;

    if (!Array.isArray(source)) {
      this.error = 'Not a list to aggregate';
      this.groups = 0;
      this.ticks.next();

      return;
    }

    // No key: fold the whole list to one number.
    if (!this.config.key) {
      const numbers = source.map(item => this.numberOf(item)).filter((n): n is number => n !== undefined);

      this.groups = 1;
      this.subject.next(fold(this.op, numbers));
      this.ticks.next();

      return;
    }

    // Grouped: one row per distinct key, with the fold as `value`. Insertion
    // order preserved, which is the order the reader saw the data.
    const buckets = new Map<string, number[]>();

    for (const item of source) {
      const groupKey = String(readConfigValue(item, this.config.key) ?? '');
      const n = this.numberOf(item);

      if (n === undefined) {
        continue;
      }

      const bucket = buckets.get(groupKey);

      if (bucket) {
        bucket.push(n);
      } else {
        buckets.set(groupKey, [n]);
      }
    }

    const rows = [...buckets.entries()].map(([groupKey, numbers]) => ({
      key: groupKey,
      value: fold(this.op, numbers),
    }));

    this.groups = rows.length;
    this.subject.next(rows);
    this.ticks.next();
  }
}
