import {
  AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject,
} from '@angular/core';
import { FB_DRAG_IGNORE, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { MandelbrotWorker, Region } from './mandelbrot.worker';

/** Rows computed per animation frame. */
const BAND = 24;

/**
 * The set, drawn a band at a time.
 *
 * Every pixel is its own little experiment — start at zero, iterate `z² + c`
 * with `c` being that pixel, and see whether it runs away — so a 300-pixel
 * square is ninety thousand of them, each up to a few hundred steps. That is
 * fast enough to watch and far too slow to do between two frames, so it is
 * done in bands: a slice of rows per frame, painted as it goes. The picture
 * builds downwards in front of the reader instead of the tab locking up, and
 * a resize or a new region cancels whatever was still running.
 *
 * A web worker would be the other answer, and it is the wrong one here: this
 * ships as a library, and a library that owns a worker file owns a bundler
 * configuration in every app that installs it.
 */
@Directive()
export abstract class MandelbrotView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('plot') plot?: ElementRef<HTMLCanvasElement>;

  worker!: MandelbrotWorker;

  /** The open views take presses; the thumbnail is a picture, not a control. */
  protected readonly interactive: boolean = false;

  protected readonly dragIgnore = FB_DRAG_IGNORE;

  private subscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private frame?: number;

  /** The finished picture, so a marker can be drawn without recomputing it. */
  private painted?: ImageData;

  ngOnInit(): void {
    this.worker = this.service.worker as MandelbrotWorker;
    this.subscription = this.worker?.changes.subscribe(what => {
      if (what === 'mark') {
        this.remark();
      } else {
        this.draw();
      }

      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.draw();

    const canvas = this.plot?.nativeElement;

    if (canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(canvas);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.stop();
  }

  /**
   * Press a place, and that place is what travels on.
   *
   * The whole section rests on this being direct: the reader points at a spot
   * in the black and the orbit beside it settles, points just outside it and
   * the orbit flies apart. A settings panel with two number fields would be
   * the same information and none of the argument.
   */
  onPress(event: PointerEvent): void {
    const canvas = this.plot?.nativeElement;

    if (!this.interactive || !canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const view = this.worker.view;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    this.worker.pick(
      view.re + (x - 0.5) * view.span,
      // Screen y grows downwards; the imaginary axis does not.
      view.im - (y - 0.5) * view.span,
    );
  }

  private stop(): void {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
  }

  protected draw(): void {
    const canvas = this.plot?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    // Layout size, never the zoom-scaled bounding rect: the graph's own zoom
    // must not multiply the pixels this computes.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) {
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    this.stop();
    this.painted = undefined;

    const view = this.worker.view;
    const iterations = this.worker.iterations;
    const image = context.createImageData(width, height);

    /*
     * The escape count per pixel, kept rather than coloured on the spot.
     *
     * The palette has to be stretched over the counts that actually OCCUR,
     * and which those are is not known until the last row: at the whole-set
     * scale points leave after two steps, and in a valley a hundred times
     * narrower the quickest of them takes forty. Colouring against the
     * iteration limit therefore left the bottom half of the ramp unused and
     * every deep view came out a flat green wash — measured, not guessed.
     *
     * So: count now, colour twice. Each band is painted against the range
     * seen so far, which keeps the picture appearing as it computes, and the
     * whole thing is repainted once at the end against the real range. The
     * second pass touches no arithmetic, only colours, and costs nothing next
     * to the iteration it follows.
     */
    const counts = new Int32Array(width * height);
    const range = { low: Infinity, high: 0 };

    const paint = (fromRow: number): void => {
      const toRow = Math.min(height, fromRow + BAND);

      for (let y = fromRow; y < toRow; y += 1) {
        const im = view.im + (0.5 - (y + 0.5) / height) * view.span;

        for (let x = 0; x < width; x += 1) {
          const re = view.re + ((x + 0.5) / width - 0.5) * view.span;
          const steps = escape(re, im, iterations);

          // −1 is "never left", which is a different answer from "left late".
          counts[y * width + x] = steps ?? -1;

          if (steps !== null) {
            range.low = Math.min(range.low, steps);
            range.high = Math.max(range.high, steps);
          }
        }
      }

      shade(image.data, counts, fromRow * width, toRow * width, range);
      context.putImageData(image, 0, 0);

      if (toRow < height) {
        this.frame = requestAnimationFrame(() => paint(toRow));
      } else {
        this.frame = undefined;
        shade(image.data, counts, 0, counts.length, range);
        context.putImageData(image, 0, 0);
        this.painted = image;
        this.mark(context, width, height, view);
      }
    };

    paint(0);
  }

  /**
   * Put the marker somewhere else on a picture that is already right.
   *
   * Nothing about the set changed — only which point of it is being asked
   * about — so this restores the last finished pixels and draws over them. If
   * the picture is still computing there is nothing to restore, and the run in
   * progress will place the marker when it finishes.
   */
  private remark(): void {
    const canvas = this.plot?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!canvas || !context || !this.painted) {
      return;
    }

    context.putImageData(this.painted, 0, 0);
    this.mark(context, canvas.width, canvas.height, this.worker.view);
  }

  /** Where the last press landed, so the wire out of this node is visible. */
  private mark(context: CanvasRenderingContext2D, width: number, height: number, view: Region): void {
    const point = this.worker.marked;

    if (!point) {
      return;
    }

    const x = ((point.re - view.re) / view.span + 0.5) * width;
    const y = (0.5 - (point.im - view.im) / view.span) * height;

    context.strokeStyle = '#ff4081';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.stroke();
  }
}

/**
 * How many steps before it left, or `null` for one that stayed.
 *
 * Squared distances only: a square root per iteration is a square root per
 * pixel per step, and this loop runs tens of millions of times to make one
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

/**
 * The ramp, and why it is not linear.
 *
 * Escape counts are not spread evenly. At the whole-set scale almost
 * everything outside leaves in under ten steps and the remaining hundreds are
 * spent in a thin band along the edge, so a linear ramp paints nine tenths of
 * the picture one flat shade — measured, not guessed: the first version drew a
 * blue rectangle with a black blob in it. A logarithm spends the palette where
 * the differences are, and stretching it over the counts actually present
 * keeps it doing that at every depth.
 *
 * The bands are not decoration either. Each one is a line of equal escape
 * time, and the way they crowd together approaching the edge is the picture's
 * real subject: the boundary is where the answer changes infinitely fast.
 */
const RAMP: [number, [number, number, number]][] = [
  [0, [10, 16, 44]],
  [0.3, [32, 96, 130]],
  [0.55, [60, 170, 165]],
  [0.78, [222, 190, 90]],
  [1, [255, 250, 235]],
];

/** Colour a run of pixels from their counts, stretched over the range found. */
function shade(
  data: Uint8ClampedArray,
  counts: Int32Array,
  from: number,
  to: number,
  range: { low: number; high: number },
): void {
  const low = Math.log(1 + Math.min(range.low, range.high));
  const high = Math.log(1 + range.high);
  const width = high - low;

  for (let pixel = from; pixel < to; pixel += 1) {
    const at = pixel * 4;
    const steps = counts[pixel];

    data[at + 3] = 255;

    // Black is not a colour on the ramp: it means the walk never left, which
    // is a different kind of answer from leaving slowly.
    if (steps < 0) {
      data[at] = 0;
      data[at + 1] = 0;
      data[at + 2] = 0;

      continue;
    }

    // A frame where everything escaped at the same step has no range to
    // stretch; one end of the ramp is as good an answer as the other.
    const t = width > 0 ? (Math.log(1 + steps) - low) / width : 1;

    for (let stop = 1; stop < RAMP.length; stop += 1) {
      const [end, top] = RAMP[stop];

      if (t <= end || stop === RAMP.length - 1) {
        const [start, bottom] = RAMP[stop - 1];
        const k = end === start ? 0 : (Math.min(t, end) - start) / (end - start);

        data[at] = Math.round(bottom[0] + (top[0] - bottom[0]) * k);
        data[at + 1] = Math.round(bottom[1] + (top[1] - bottom[1]) * k);
        data[at + 2] = Math.round(bottom[2] + (top[2] - bottom[2]) * k);

        break;
      }
    }
  }
}
