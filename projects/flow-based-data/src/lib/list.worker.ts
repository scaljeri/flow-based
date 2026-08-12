import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FbEnvelope, isEnvelope, unwrap } from './envelope';

export type ListOp = 'sort' | 'slice' | 'length' | 'pluck';

export interface ListConfig {
  op?: ListOp;
  /** The field to sort by, or to pull out (pluck); blank uses the item itself. */
  path?: string;
  dir?: 'asc' | 'desc';
  /** How many to keep (slice).*/
  n?: number;
}

/**
 * Reshape a list: order it, cut it, measure it, pull a column from it.
 *
 * "Top 10 by value" could not be built from nodes at all — it is sort desc then
 * slice 10, and neither existed. `pluck` pulls one field out of every row (the
 * labels for a chart, say); `length` counts. The envelope carries through, so
 * the meta the list arrived with survives the reshape.
 */
export class ListWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  error: string | null = null;
  count = 0;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: ListConfig = {}) {
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

  get op(): ListOp {
    return this.config.op ?? 'sort';
  }

  /** For the drawing. */
  get path(): string {
    return this.config.path ?? '';
  }

  get dir(): 'asc' | 'desc' {
    return this.config.dir === 'desc' ? 'desc' : 'asc';
  }

  get n(): number {
    return this.config.n ?? 10;
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => this.transform(value));
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

  private at(item: unknown): unknown {
    return this.config.path ? readConfigValue(item, this.config.path) : item;
  }

  private transform(value: unknown): void {
    this.error = null;
    const meta = isEnvelope(value) ? (value as FbEnvelope).meta : undefined;
    const source = isEnvelope(value) ? unwrap(value) : value;

    if (!Array.isArray(source)) {
      this.error = 'Not a list';
      this.count = 0;
      this.ticks.next();

      return;
    }

    if (this.op === 'length') {
      this.count = source.length;
      this.subject.next(source.length);
      this.ticks.next();

      return;
    }

    let out: unknown[];

    if (this.op === 'pluck') {
      out = source.map(item => this.at(item));
    } else if (this.op === 'slice') {
      out = source.slice(0, Math.max(0, Math.floor(this.config.n ?? 10)));
    } else {
      // sort: a stable copy, compared on the chosen field. Numbers order
      // numerically, everything else by its string form.
      const sign = this.config.dir === 'desc' ? -1 : 1;

      out = [...source].sort((a, b) => {
        const x = this.at(a);
        const y = this.at(b);

        if (typeof x === 'number' && typeof y === 'number') {
          return (x - y) * sign;
        }

        return String(x).localeCompare(String(y)) * sign;
      });
    }

    this.count = out.length;
    // Keep the envelope so the list's meta survives the reshape.
    this.subject.next(meta ? { meta, value: out } : out);
    this.ticks.next();
  }
}
