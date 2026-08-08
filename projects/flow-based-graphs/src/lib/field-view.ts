import { Directive } from '@angular/core';
import { FB_DRAG_IGNORE } from '@scaljeri/flow-based';
import { Observable } from 'rxjs';
import { CanvasView } from './canvas-view';
import { Field, fieldRange } from './field';
import { Ramp, rampAt } from './plot-core';
import { FieldPlotWorker } from './field.worker';

/**
 * Deep navy through teal to a warm white, and black for nothing.
 *
 * Black is not a stop on the ramp: a cell with no value is a different kind of
 * answer from a cell with a small one, and giving it the bottom colour would
 * make "we never found out" look like "hardly any".
 */
const RAMP: Ramp = [
  [0, [10, 16, 44]],
  [0.3, [32, 96, 130]],
  [0.55, [60, 170, 165]],
  [0.78, [222, 190, 90]],
  [1, [255, 250, 235]],
];

/**
 * A field, coloured.
 *
 * The whole drawing is one `putImageData` — the values arrived already
 * computed, so there is nothing here to do in slices. Whoever produced them
 * may still be working, and says so with `done`; a partly-filled field draws
 * as far as it has got, which is how a picture that takes a second to compute
 * appears while it is being made rather than after.
 */
@Directive()
export abstract class FieldView extends CanvasView {
  /** The open views take presses; the thumbnail is a picture, not a control. */
  protected readonly interactive: boolean = false;

  protected readonly dragIgnore = FB_DRAG_IGNORE;

  get worker(): FieldPlotWorker {
    return this.service.worker as FieldPlotWorker;
  }

  protected changes(): Observable<unknown> | undefined {
    return this.worker?.changes;
  }

  get title(): string {
    return this.worker?.title ?? '';
  }

  /** Whether anything has arrived, for a view that would rather say so. */
  get waiting(): boolean {
    return !this.worker?.field;
  }

  /**
   * Press a place, and that place is what travels on.
   *
   * In the field's own coordinates, not the canvas's: what a reader points at
   * is a value of x and y, and the pixel it happened to land on is this
   * node's business alone.
   */
  onPress(event: PointerEvent): void {
    const canvas = this.plot?.nativeElement;
    const field = this.worker?.field;

    if (!this.interactive || !canvas || !field) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;

    this.worker.pick(
      field.x.min + u * (field.x.max - field.x.min),
      // Row 0 is the top, so a press near the top is the HIGH y.
      field.y.max - v * (field.y.max - field.y.min),
    );
  }

  protected draw(): void {
    const surface = this.surface();
    const field = this.worker?.field;

    if (!surface) {
      return;
    }

    const { ctx, width, height } = surface;

    ctx.clearRect(0, 0, width, height);

    if (!field) {
      return;
    }

    const pinned = this.worker.pinned;
    const found = fieldRange(field) ?? { low: 0, high: 1 };
    const low = pinned.min ?? found.low;
    const high = pinned.max ?? found.high;

    /*
     * The image is the FIELD's size, then stretched to the canvas.
     *
     * Which is the honest thing to do: the producer decided how finely it
     * looked, and drawing one cell per screen pixel would invent detail it
     * never computed. A field coarser than the box it is drawn in looks
     * coarse, and that is information rather than a defect.
     */
    const image = ctx.createImageData(field.cols, field.rows);

    for (let i = 0; i < field.values.length; i += 1) {
      const value = field.values[i];
      const at = i * 4;

      image.data[at + 3] = 255;

      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      const [r, g, b] = rampAt(RAMP, this.fraction(value, low, high));

      image.data[at] = r;
      image.data[at + 1] = g;
      image.data[at + 2] = b;
    }

    this.paint(ctx, image, width, height);
    this.mark(ctx, field, width, height);
  }

  /**
   * Where a value falls on the ramp.
   *
   * Log for the ranges where almost everything is small and the interesting
   * part is a thin band at the top — measured on the Mandelbrot, where a
   * linear ramp drew a blue rectangle with a black blob in it.
   */
  private fraction(value: number, low: number, high: number): number {
    if (this.worker.scale === 'log') {
      const span = Math.log(1 + high - low);

      return span > 0 ? Math.log(1 + value - low) / span : 1;
    }

    return high > low ? (value - low) / (high - low) : 1;
  }

  /** Stretch the field's own pixels over the canvas, unsmoothed. */
  private paint(
    ctx: CanvasRenderingContext2D,
    image: ImageData,
    width: number,
    height: number,
  ): void {
    const buffer = document.createElement('canvas');

    buffer.width = image.width;
    buffer.height = image.height;
    buffer.getContext('2d')!.putImageData(image, 0, 0);

    // Nearest-neighbour: a smoothed field is a field with values in it that
    // nobody computed.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, 0, 0, width, height);
  }

  /** Where the last press landed, so the wire out of this node is visible. */
  private mark(
    ctx: CanvasRenderingContext2D,
    field: Field,
    width: number,
    height: number,
  ): void {
    const point = this.worker.marked;

    if (!point) {
      return;
    }

    const x = ((point.re - field.x.min) / (field.x.max - field.x.min)) * width;
    const y = ((field.y.max - point.im) / (field.y.max - field.y.min)) * height;

    ctx.strokeStyle = '#ff4081';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}
