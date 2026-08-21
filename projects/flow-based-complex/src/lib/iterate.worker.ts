import { FbConnection, FbNodeWorker, FbSocket, writeConfigValue } from '@scaljeri/flow-based';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { MarkedPoint, MarkedPoints } from './points.worker';

export interface IterateConfig {
  /** The constant added at every step. */
  c?: { re: number; im: number };
  /** Where the walk starts. Zero for the Mandelbrot question. */
  z0?: { re: number; im: number };
  /** How many steps to take before calling it bounded. */
  steps?: number;
  /** Past this distance from zero it never comes back — 2, provably. */
  escape?: number;
  /** Milliseconds per step, for the walk the plane animates. */
  interval?: number;
}

/*
 * Inside the set, and visibly so: this one spirals into a fixed point rather
 * than sitting on it, which is the picture the section is about. A c that
 * escapes is one drag away, and a c that lands exactly on a cycle looks like
 * a bug from the outside.
 */
const DEFAULT_C = { re: -0.5, im: 0.5 };

/**
 * Squaring is turning twice as fast, and this repeats it.
 *
 * `z → z² + c`, over and over from `z = 0`. Every other node in this module
 * answers a question about a value; this one answers a question about a
 * PROCESS, and the difference is that it has to remember where it was. A
 * formula has no memory and a sampler sweeps a range — neither can iterate,
 * which is why this exists rather than being a configuration of something
 * already here.
 *
 * The whole point is visible on the complex plane the rest of the page already
 * draws on: squaring doubles the angle and squares the distance, so a `z`
 * inside the unit circle is dragged towards zero and one outside runs away.
 * Adding `c` nudges it sideways every time. Between those two pulls the walk
 * either settles into a loop or escapes, and WHICH of the two — for each `c` —
 * is the only question the Mandelbrot set asks.
 *
 * It emits the same `marks` a set of points does, so the plane needs to know
 * nothing new: the orbit is a list of positions with the one it is on marked.
 * Escaped orbits are cut at the first step past the escape radius, because a
 * value at 10^38 is not a point on a picture — it is an axis nobody can read.
 */
export class IterateWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<MarkedPoints>(1);
  private readonly subscriptions: { [id: number]: Subscription } = {};

  private timer?: ReturnType<typeof setInterval>;
  private index = 0;

  /** The orbit as last computed, and what became of it. */
  private orbit: MarkedPoint[] = [];

  /** The step it escaped on, or null when it stayed. */
  escapedAt: number | null = null;

  /**
   * A `c` that arrived on the wire, kept apart from the one in the config.
   *
   * A wire must not rewrite what a flow SAVES. Pressing a picture of the set
   * would otherwise edit this node's stored `c`, so the flow you saved is not
   * the flow you opened, and a document's inline input for that value would be
   * showing a number nobody typed. What is wired wins while it is wired, and
   * the written-down value is still underneath it.
   */
  private wired?: { re: number; im: number };

  constructor(private readonly config: IterateConfig = {}) {
    this.recompute();
    this.restart();
  }

  destroy(): void {
    clearInterval(this.timer);
    Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
    this.subject.complete();
  }

  getStream(): Observable<MarkedPoints> {
    return this.subject.asObservable();
  }

  /**
   * A `c` from somewhere else takes over from the one in the config.
   *
   * Which is how a picture of the set can drive this: press a place on it and
   * the orbit for that place is what walks. Nothing is wired by default, and
   * then the config's own `c` is the answer.
   */
  setStream(stream: Observable<unknown>, socket: FbSocket, connection: FbConnection): void {
    this.subscriptions[connection.id] = stream.subscribe(value => {
      const point = value as { re?: number; im?: number } | null;

      if (point && typeof point.re === 'number' && typeof point.im === 'number') {
        this.wired = { re: point.re, im: point.im };
        this.recompute();
        this.restart();
      }
    });
  }

  /** The wire is gone, so the written-down value is the answer again. */
  removeStream(connection: FbConnection): void {
    this.subscriptions[connection.id]?.unsubscribe();
    delete this.subscriptions[connection.id];

    if (!Object.keys(this.subscriptions).length) {
      this.wired = undefined;
      this.recompute();
      this.restart();
    }
  }

  get c(): { re: number; im: number } {
    return this.wired ?? this.config.c ?? DEFAULT_C;
  }

  get z0(): { re: number; im: number } {
    return this.config.z0 ?? { re: 0, im: 0 };
  }

  get steps(): number {
    return Math.max(1, Math.round(this.config.steps ?? 40));
  }

  get escape(): number {
    return this.config.escape ?? 2;
  }

  get interval(): number {
    return Math.max(0, this.config.interval ?? 300);
  }

  /** How far the walk got: every point of it, escaped or not. */
  get length(): number {
    return this.orbit.length;
  }

  /** Where it is now, for the node's own drawing. */
  get current(): MarkedPoint | undefined {
    return this.orbit[this.index];
  }

  read(key: keyof IterateConfig): string {
    const value = this.config[key];

    return value === undefined || value === null ? '' : String(value);
  }

  set(key: 'steps' | 'escape' | 'interval', value: number): void {
    // Through setConfigValue (the announce wrap) so a panel edit marks dirty.
    this.setConfigValue(key, value);
  }

  /** Typing a number takes control back from whatever is wired in. */
  setC(part: 're' | 'im', value: number): void {
    this.config.c = { ...this.c, [part]: value };
    this.wired = undefined;
    this.recompute();
    this.restart();
  }

  /**
   * A config write from a document's inline inputs.
   *
   * `c.re` and `c.im` are the two worth exposing there: the whole section is
   * one sentence — move c, and the same rule either settles or runs away.
   */
  setConfigValue(path: string, value: unknown): void {
    if (!writeConfigValue(this.config as Record<string, unknown>, path, value)) {
      return;
    }

    // Same as typing in the panel: a hand on the number wins over a wire.
    if (path.startsWith('c')) {
      this.wired = undefined;
    }

    this.recompute();
    this.restart();
  }

  /**
   * Walk it, and stop early if it leaves.
   *
   * Two is not a guess: once `|z|` passes 2 the squaring outruns anything `c`
   * can add back, so the walk is gone for good. Testing the SQUARED distance
   * keeps a square root out of the inner loop, which matters when a picture of
   * the set runs this per pixel.
   */
  private recompute(): void {
    const { re: cRe, im: cIm } = this.c;
    const limit = this.escape * this.escape;
    const marks: MarkedPoint[] = [];

    let re = this.z0.re;
    let im = this.z0.im;

    this.escapedAt = null;

    for (let step = 0; step <= this.steps; step += 1) {
      /*
       * Only the first few are named. A bounded orbit converges, so the last
       * thirty labels land on top of each other and the picture becomes a
       * white smear over exactly the point it is trying to show. Three names
       * are enough to establish that these are steps, and the dots carry the
       * rest.
       */
      marks.push({ re, im, label: step <= 3 ? `z${subscript(step)}` : undefined });

      if (re * re + im * im > limit) {
        this.escapedAt = step;
        // The one that left is worth naming wherever it happens to be.
        marks[marks.length - 1].label = `z${subscript(step)}`;
        break;
      }

      const nextRe = re * re - im * im + cRe;

      im = 2 * re * im + cIm;
      re = nextRe;
    }

    this.orbit = marks;
    this.index = Math.min(this.index, marks.length - 1);
    this.emit();
  }

  private restart(): void {
    clearInterval(this.timer);

    /*
     * Zero means "no walk": the whole orbit at once, which is the right
     * picture for a reader comparing two values of c rather than watching one.
     */
    if (this.interval > 0) {
      // A NEW orbit walks from z0. The index survived a restart, so pressing a
      // new point continued from step k of the previous walk — the reader saw
      // an orbit that began mid-flight.
      this.index = 0;
      this.timer = setInterval(() => this.step(), this.interval);
    } else {
      this.index = this.orbit.length - 1;
      this.emit();
    }
  }

  private step(): void {
    this.index = this.orbit.length ? (this.index + 1) % this.orbit.length : 0;
    this.emit();
  }

  private emit(): void {
    this.subject.next({ marks: this.orbit, current: this.index });
  }
}

/** `z12` reads badly next to `z₁₂`, and the plane draws these as labels. */
function subscript(value: number): string {
  return String(value).replace(/\d/g, digit => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)] ?? digit);
}
