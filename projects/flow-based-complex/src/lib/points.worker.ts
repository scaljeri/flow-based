import { FbNodeWorker, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject } from 'rxjs';

/** One position in the plane, with the name it goes by. */
export interface MarkedPoint {
  re: number;
  im: number;
  /** Drawn beside the dot. Optional: a set of anonymous positions is fine. */
  label?: string;
}

export interface PointsConfig {
  points?: MarkedPoint[];
  /** Milliseconds per step. */
  interval?: number;
}

/**
 * What a set of marked points looks like on the wire.
 *
 * The WHOLE set travels every tick, with an index saying which one is current.
 * Emitting one point at a time would have been less to send and much worse to
 * draw: a plot would have to remember the positions it had been told about,
 * and it could never label the ones it had not seen yet. A figure whose four
 * dots appear one by one teaches the walk but not the four corners it walks
 * between.
 */
export interface MarkedPoints {
  marks: MarkedPoint[];
  /** Index into `marks`, or undefined when nothing is current. */
  current?: number;
}

const DEFAULT_POINTS: MarkedPoint[] = [
  { re: 1, im: 0, label: '1' },
  { re: 0, im: 1, label: 'i' },
  { re: -1, im: 0, label: '−1' },
  { re: 0, im: -1, label: '−i' },
];

/**
 * A producer that walks a fixed list of points, one per tick.
 *
 * The generator this repo already had makes numbers out of nothing; this one
 * reads out numbers somebody chose in advance, which is what an explanation
 * needs — a picture that says "here are the four values, and here is the one
 * we are at" rather than "here is some noise".
 *
 * `re` and `im` are named fields rather than a two-element array, matching the
 * {re, im} pair that already travels these wires, and leaving room for the
 * label beside them.
 */
export class PointsWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<MarkedPoints>(1);
  private timer?: ReturnType<typeof setInterval>;
  private index = 0;

  // The engine hands a worker its node's CONFIG object — the same one the JSON
  // serialises — so writing into it in place is what persists.
  constructor(private readonly config: PointsConfig = {}) {
    this.emit();
    this.restart();
  }

  destroy(): void {
    clearInterval(this.timer);
    this.subject.complete();
  }

  getStream(): Observable<MarkedPoints> {
    return this.subject.asObservable();
  }

  setStream(): void {
    // A producer has no inputs.
  }

  removeStream(): void {
    // A producer has no inputs.
  }

  get points(): MarkedPoint[] {
    return this.config.points?.length ? this.config.points : DEFAULT_POINTS;
  }

  get interval(): number {
    return this.config.interval ?? 900;
  }

  /** The point the walk is on, for the node's own drawing. */
  get current(): MarkedPoint | undefined {
    return this.points[this.index];
  }

  setPoint(index: number, patch: Partial<MarkedPoint>): void {
    const points = [...this.points];

    if (!points[index]) {
      return;
    }

    points[index] = { ...points[index], ...patch };
    this.config.points = points;
    this.emit();
  }

  addPoint(): void {
    this.config.points = [...this.points, { re: 0, im: 0, label: '' }];
    this.emit();
  }

  removePoint(index: number): void {
    const points = this.points.filter((_, i) => i !== index);

    // Never empty: a walk over nothing has no picture, and the defaults are a
    // better answer than a blank plane.
    this.config.points = points.length ? points : undefined;
    this.index = Math.min(this.index, this.points.length - 1);
    this.emit();
  }

  setInterval(ms: number): void {
    this.config.interval = ms;
    this.restart();
  }

  /**
   * A config write from outside the settings panel — a document's inline
   * inputs. The speed is the one worth exposing there, and it needs the timer
   * restarted rather than only re-emitted.
   */
  setConfigValue(path: string, value: unknown): void {
    if (!writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      return;
    }

    if (path === 'interval') {
      this.restart();
    } else {
      this.emit();
    }
  }

  private restart(): void {
    clearInterval(this.timer);

    /*
     * A floor, not a validation: a document input can be dragged to zero, and
     * setInterval(0) is a busy loop that takes the page down with it.
     */
    this.timer = setInterval(() => this.step(), Math.max(30, this.interval));
  }

  private step(): void {
    this.index = (this.index + 1) % this.points.length;
    this.emit();
  }

  private emit(): void {
    const points = this.points;

    this.index = this.index % points.length;
    this.subject.next({ marks: points.map(p => ({ ...p })), current: this.index });
  }
}
