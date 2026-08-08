import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';

/** A square of the plane: where its middle is, and how wide it is. */
export interface Region {
  re: number;
  im: number;
  span: number;
}

export interface MandelbrotConfig {
  view?: Region;
  /** How long to keep iterating before calling a point bounded. */
  iterations?: number;
  /** How many cells across the answer is worked out. */
  resolution?: number;
}

/** The whole set, with room around it. */
export const WHOLE_SET: Region = { re: -0.6, im: 0, span: 3.2 };

/** Rows computed per frame. */
const CHUNK = 12;

/**
 * `z → z² + c`, asked of every point of a square, and answered as a field.
 *
 * This used to be a plot node that drew its own answer — the computation and
 * the colouring fused, so nothing else could draw the field and nothing else
 * could feed the drawing. They are two things: this works out how long each
 * point takes to escape, and a field plot colours whatever it is handed.
 *
 * What that split costs, honestly: the old node computed one value per SCREEN
 * pixel and recomputed on every resize, so it was always exactly as fine as
 * the box it was drawn in. A field has to decide its own size before it knows
 * who will draw it, so `resolution` is a number here and a big view stretches
 * it. Raise it and the picture is finer and slower; that is now a decision
 * somebody makes rather than one the window makes for them.
 *
 * What it keeps: the work is chunked across frames and the field is emitted
 * as it fills, so the picture appears while it is being made; a new region
 * cancels the run in flight; and the iteration count still rises with the
 * zoom, because that is a fact about this computation rather than about the
 * drawing.
 */
export class MandelbrotWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<unknown>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  /** Told when the node's own drawing should change. */
  private readonly ticks = new Subject<void>();

  get changes(): Observable<void> {
    return this.ticks.asObservable();
  }

  private frame?: number;
  private values: (number | null)[] = [];
  private row = 0;

  constructor(private readonly config: MandelbrotConfig = {}) {
    this.restart();
  }

  destroy(): void {
    this.stop();
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
    this.ticks.complete();
  }

  getStream(): Observable<unknown> {
    return this.subject.asObservable();
  }

  /** A region from elsewhere: a named viewpoint, wired in. */
  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const region = value as Partial<Region> | null;

      if (region && typeof region.re === 'number' && typeof region.im === 'number'
        && typeof region.span === 'number' && region.span > 0) {
        this.config.view = { re: region.re, im: region.im, span: region.span };
        this.restart();
      }
    });
  }

  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];
  }

  get view(): Region {
    return this.config.view ?? WHOLE_SET;
  }

  get resolution(): number {
    return Math.max(32, Math.min(1200, Math.round(this.config.resolution ?? 400)));
  }

  /**
   * How long to keep going before calling a point "stays".
   *
   * It rises with the zoom, and it has to. The count is not image quality —
   * it is the patience the answer is computed with, and the closer you look
   * the longer the interesting points take to make up their minds. At the
   * whole-set scale 200 is generous; in a valley a hundred times narrower the
   * same 200 paints every filament solid and the detail that makes the place
   * worth visiting simply is not there. The configured number is a floor.
   */
  get iterations(): number {
    const asked = Math.max(10, Math.round(this.config.iterations ?? 200));
    const zoom = Math.max(1, WHOLE_SET.span / this.view.span);

    return Math.max(asked, Math.round(120 + 90 * Math.log10(zoom)));
  }

  /** How far the current answer has got, 0 to 1. */
  get progress(): number {
    return this.resolution ? Math.min(1, this.row / this.resolution) : 0;
  }

  setView(view: Region): void {
    this.config.view = view;
    this.restart();
  }

  set(key: 'iterations' | 'resolution', value: number): void {
    this.config[key] = value;
    this.restart();
  }

  setConfigValue(path: string, value: unknown): void {
    if (writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      this.restart();
    }
  }

  private stop(): void {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
  }

  /**
   * Begin again, from the top row.
   *
   * Everything not yet worked out is `null` rather than zero: a cell nobody
   * has reached is not a cell that escaped immediately, and a plot must be
   * able to tell them apart or the picture fills in from the top in the
   * colour of "gone at once".
   */
  private restart(): void {
    this.stop();

    const size = this.resolution;

    this.values = new Array(size * size).fill(null);
    this.row = 0;

    if (typeof requestAnimationFrame === 'undefined') {
      // No frames to wait for — a test environment. Do it in one go.
      this.compute(size);
      this.emit();

      return;
    }

    this.step();
  }

  private step(): void {
    const size = this.resolution;

    this.compute(size, CHUNK);
    this.emit();

    if (this.row < size) {
      this.frame = requestAnimationFrame(() => this.step());
    } else {
      this.frame = undefined;
    }
  }

  /** Work out the next `rows` rows, or all of them when told nothing. */
  private compute(size: number, rows = Number.POSITIVE_INFINITY): void {
    const view = this.view;
    const limit = this.iterations;
    const until = Math.min(size, this.row + rows);

    for (; this.row < until; this.row += 1) {
      // Row 0 is the top, which is the HIGHEST imaginary part.
      const im = view.im + (0.5 - (this.row + 0.5) / size) * view.span;

      for (let column = 0; column < size; column += 1) {
        const re = view.re + ((column + 0.5) / size - 0.5) * view.span;

        this.values[this.row * size + column] = escape(re, im, limit);
      }
    }
  }

  private emit(): void {
    const size = this.resolution;
    const view = this.view;
    const half = view.span / 2;

    this.subject.next({
      field: {
        rows: size,
        cols: size,
        values: this.values,
        x: { min: view.re - half, max: view.re + half },
        y: { min: view.im - half, max: view.im + half },
        unit: 'steps',
        done: this.progress,
      },
      title: 'z² + c',
    });

    this.ticks.next();
  }
}

/**
 * How many steps before it left, or `null` for one that stayed.
 *
 * Squared distances only: a square root per iteration is a square root per
 * cell per step, and this loop runs tens of millions of times to make one
 * picture. The cardioid and the main bulb are checked first — between them
 * they are most of the black, and every point in them would otherwise be
 * iterated the full count to learn what algebra already knows.
 */
function escape(cRe: number, cIm: number, limit: number): number | null {
  const q = (cRe - 0.25) * (cRe - 0.25) + cIm * cIm;

  if (q * (q + (cRe - 0.25)) <= 0.25 * cIm * cIm) {
    return null;
  }

  if ((cRe + 1) * (cRe + 1) + cIm * cIm <= 0.0625) {
    return null;
  }

  let re = 0;
  let im = 0;

  for (let step = 0; step < limit; step += 1) {
    const re2 = re * re;
    const im2 = im * im;

    if (re2 + im2 > 4) {
      return step;
    }

    im = 2 * re * im + cIm;
    re = re2 - im2 + cRe;
  }

  return null;
}
