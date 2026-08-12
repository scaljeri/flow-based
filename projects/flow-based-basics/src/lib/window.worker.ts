import { FbConnection, FbNodeSettings, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

export type WindowOp = 'mean' | 'min' | 'max' | 'sum';

export interface WindowConfig {
  op?: WindowOp;
  /** How many of the most recent values to fold over. */
  size?: number;
}

export const WINDOW_SETTINGS: FbNodeSettings = {
  title: 'Moving average',
  help: 'A rolling fold over the last N numbers — mean, min, max or sum. Smoothing a live feed is generic maths, not one case\'s vocabulary; the crypto demo had to ship its own lib for a rolling mean. Feed it a number stream; out is the fold, recomputed on each arrival.',
  config: { op: 'mean', size: 5 },
  sockets: [
    { type: 'in', format: 'number' },
    { type: 'out', format: 'number' },
  ],
};

const toNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(n) ? n : undefined;
};

/** A ring of the last N numbers, folded on each arrival. */
export class WindowWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly ticks = new ReplaySubject<void>(1);
  private readonly subscriptions: Record<number, Subscription> = {};

  private buffer: number[] = [];

  reading?: number;

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  constructor(private readonly config: WindowConfig = {}) {
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

  get op(): WindowOp {
    return this.config.op ?? 'mean';
  }

  get size(): number {
    return Math.max(1, Math.floor(this.config.size ?? 5));
  }

  setStream(stream: Observable<unknown>, _socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const n = toNumber(value);

      if (n === undefined) {
        return;   // a non-number is not a sample; skip it rather than poison the window
      }

      this.buffer.push(n);

      // Keep only the last `size`; a shrunk window drops the oldest immediately.
      if (this.buffer.length > this.size) {
        this.buffer = this.buffer.slice(-this.size);
      }

      this.emit();
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      // A size change re-folds what is already buffered.
      if (this.buffer.length > this.size) {
        this.buffer = this.buffer.slice(-this.size);
      }

      this.emit();
      this.ticks.next();
    }
  }

  private emit(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const sum = this.buffer.reduce((a, b) => a + b, 0);
    const value =
      this.op === 'sum' ? sum
        : this.op === 'min' ? Math.min(...this.buffer)
          : this.op === 'max' ? Math.max(...this.buffer)
            : sum / this.buffer.length;   // mean

    this.reading = value;
    this.subject.next(value);
    this.ticks.next();
  }
}
