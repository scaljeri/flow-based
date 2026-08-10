import { FbConnection, FbNodeWorker, FbSocket, readConfigValue, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { FbEnvelope, isEnvelope, unwrap } from './envelope';

export interface JoinConfig {
  /** Path to the key within an item of `a`, and of `b`. */
  pathA?: string;
  pathB?: string;
  /** `inner` keeps matched items only; `left` keeps all of `a`. */
  how?: 'inner' | 'left';
}

/**
 * Two lists, aligned by key — Morrison's collate.
 *
 * Two measurement series on one time axis, model beside measurement per
 * station: real data stories compare, and comparing starts with putting the
 * rows that belong together in one row. n8n's merge-by-key exists for the
 * same reason. Matched items are merged b-over-a (`{...a, ...b}`), which is
 * the convention every join a spreadsheet user has met follows: the right
 * side annotates the left.
 *
 * The envelope survives from `a` — the left side is the story being told,
 * the right side is what was looked up for it.
 */
export class JoinWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: Record<number, Subscription> = {};
  private readonly ticks = new ReplaySubject<void>(1);

  private left?: { list: unknown[]; meta?: FbEnvelope['meta'] };
  private right?: { list: unknown[] };

  /** For the node's own drawing: how many of `a` found a partner. */
  matched = 0;
  total = 0;
  error: string | null = null;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: JoinConfig = {}) {
  }

  destroy(): void {
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    const side = socket.name === 'b' ? 'b' : 'a';

    this.subscriptions[connection.id] = stream.subscribe(value => {
      const meta = isEnvelope(value) ? value.meta : undefined;
      const source = unwrap(value);
      const list = Array.isArray(source) ? source : [];

      if (side === 'a') {
        this.left = { list, meta };
      } else {
        this.right = { list };
      }

      this.error = Array.isArray(source) ? this.error : `Side ${side} is not a list`;
      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get how(): 'inner' | 'left' {
    return this.config.how === 'left' ? 'left' : 'inner';
  }

  read(key: keyof JoinConfig): string {
    const value = this.config[key];

    return value === undefined || value === null ? '' : String(value);
  }

  write(key: keyof JoinConfig, value: string): void {
    (this.config as Record<string, unknown>)[key] = value;
    this.emit();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.emit();
    }
  }

  /** Join what is here; fires once both sides have arrived. */
  private emit(): void {
    this.ticks.next();

    if (!this.left || !this.right) {
      return;
    }

    const keyOf = (item: unknown, path?: string): string | undefined => {
      const key = path ? readConfigValue(item, path) : item;

      return key === undefined || key === null || typeof key === 'object'
        ? undefined
        : String(key);
    };

    /*
     * The right side indexed once, first key wins: a duplicate key on `b` is
     * the publisher saying the same thing twice, and taking the first is at
     * least deterministic.
     */
    const byKey = new Map<string, unknown>();

    for (const item of this.right.list) {
      const key = keyOf(item, this.config.pathB);

      if (key !== undefined && !byKey.has(key)) {
        byKey.set(key, item);
      }
    }

    const joined: unknown[] = [];

    this.matched = 0;
    this.total = this.left.list.length;

    for (const item of this.left.list) {
      const key = keyOf(item, this.config.pathA);
      const partner = key === undefined ? undefined : byKey.get(key);

      if (partner !== undefined) {
        this.matched++;

        // b-over-a: the right side annotates the left.
        joined.push({ ...(item as object), ...(partner as object) });
      } else if (this.how === 'left') {
        joined.push(item);
      }
    }

    this.subject.next(this.left.meta ? { meta: this.left.meta, value: joined } : joined);
    this.ticks.next();
  }
}
