import { Directive } from '@angular/core';
import { Observable } from 'rxjs';
import { CanvasView } from './canvas-view';
import { LAYER_COLOURS } from './plot-core';
import { SeriesBuffer, PlotWorker } from './plot.worker';

/**
 * The complex plane: im against re, the sample's x forgotten on purpose.
 *
 * A complex series [x, re, im] is a PATH through the plane — e^(i·x) walks a
 * circle, e^((i·b−a)·x) spirals into the origin. Time is the parameter, not
 * an axis, so this view draws the trajectory the wave view can only show as
 * two separate wiggles.
 *
 * One scale for both axes, always: a circle that renders as an ellipse is a
 * lie about the data.
 */
@Directive()
export abstract class PlaneView extends CanvasView {
  get worker(): PlotWorker {
    return this.service.worker as PlotWorker;
  }

  protected changes(): Observable<unknown> | undefined {
    return this.worker?.getStream();
  }

  get title(): string {
    return this.worker?.buffer.labels?.title ?? '';
  }

  /** The open views draw axes; the small view stays a bare trajectory. */
  protected readonly axes: boolean = false;

  protected draw(): void {
    const surface = this.surface();

    if (!surface) {
      return;
    }

    const { ctx, width, height } = surface;

    ctx.clearRect(0, 0, width, height);

    const layers = this.layersOf<SeriesBuffer>(this.worker, this.worker.buffer);

    if (!layers.length) {
      return;
    }

    /*
     * One scale for every layer, and for both axes.
     *
     * Layers only mean anything if they agree about where a point is: a curve
     * and the dot riding along it must be measured the same way, or the dot
     * drifts off its own curve. So the extent is taken over everything drawn.
     */
    const all = layers.flatMap(layer => [
      ...layer.points.map(p => [p[1], p[2] ?? 0]),
      ...(layer.marks ?? []).map(m => [m.re, m.im]),
    ]);

    if (!all.length) {
      return;
    }

    const res = all.map(p => p[0]);
    const ims = all.map(p => p[1]);
    // Marks carry labels, and a label at the edge needs room to be written.
    const marked = layers.some(layer => layer.marks?.length);
    const pad = (this.axes ? 26 : 6) + (marked ? 14 : 0);

    /*
     * Named positions are ADDRESSES: a picture of 1, i, -1 and -i with the
     * origin off-centre has thrown away its own subject, so a marked plot
     * centres on zero. A bare trajectory centres on the data it has.
     */
    const midRe = marked ? 0 : (Math.min(...res) + Math.max(...res)) / 2;
    const midIm = marked ? 0 : (Math.min(...ims) + Math.max(...ims)) / 2;
    const span = marked
      ? Math.max(...res.map(Math.abs), ...ims.map(Math.abs)) * 2
      : Math.max(
        Math.max(...res) - Math.min(...res),
        Math.max(...ims) - Math.min(...ims),
      );
    const scale = (Math.min(width, height) - pad * 2) / (span || 1);

    const x = (re: number) => width / 2 + (re - midRe) * scale;
    const y = (im: number) => height / 2 - (im - midIm) * scale;

    if (this.axes || marked) {
      // The axes of the PLANE: the zero cross, wherever zero happens to be.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x(0), 0);
      ctx.lineTo(x(0), height);
      ctx.moveTo(0, y(0));
      ctx.lineTo(width, y(0));
      ctx.stroke();
    }

    if (this.axes) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('re', width - 16, y(0) + 4);
      ctx.fillText('im', x(0) + 4, 2);
    }

    // Bottom socket first: a layer covers the ones declared before it, which
    // makes the node's own socket order the drawing order.
    layers.forEach((layer, index) => {
      const colours = LAYER_COLOURS[index % LAYER_COLOURS.length];

      this.drawPath(ctx, layer, colours, x, y);
      this.drawMarks(ctx, layer, colours, x, y);
    });
  }

  private drawPath(
    ctx: CanvasRenderingContext2D,
    layer: SeriesBuffer,
    colours: { path: string; mark: string },
    x: (re: number) => number,
    y: (im: number) => number,
  ): void {
    // A real-only series lives ON the real axis: im is simply 0.
    const points = layer.points.map(p => [p[1], p[2] ?? 0]);

    if (points.length < 2) {
      return;
    }

    /*
     * The path fades toward its tail: a spiral crosses itself, and without a
     * direction cue the drawing is a tangle instead of a journey.
     */
    for (let i = 1; i < points.length; i++) {
      ctx.strokeStyle = `rgba(${colours.path}, ${0.25 + 0.75 * (i / points.length)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x(points[i - 1][0]), y(points[i - 1][1]));
      ctx.lineTo(x(points[i][0]), y(points[i][1]));
      ctx.stroke();
    }

    // The head, marked: where the function is NOW.
    const head = points[points.length - 1];

    ctx.fillStyle = colours.mark;
    ctx.beginPath();
    ctx.arc(x(head[0]), y(head[1]), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * A named set of positions, one of them current, drawn on top of whatever
   * its layer's path already put down.
   *
   * The current mark gets a line back to zero — that arm is where turning
   * becomes visible, since consecutive marks on these figures are a quarter of
   * a circle apart.
   */
  private drawMarks(
    ctx: CanvasRenderingContext2D,
    layer: SeriesBuffer,
    colours: { path: string; mark: string },
    x: (re: number) => number,
    y: (im: number) => number,
  ): void {
    const marks = layer.marks ?? [];
    const current = layer.current;

    ctx.font = '11px system-ui, sans-serif';

    marks.forEach((mark, index) => {
      const active = index === current;
      const px = x(mark.re);
      const py = y(mark.im);

      if (active) {
        ctx.strokeStyle = `rgba(${colours.path}, 0.55)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x(0), y(0));
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      ctx.fillStyle = active ? colours.mark : `rgba(${colours.path}, 0.35)`;
      ctx.beginPath();
      ctx.arc(px, py, active ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();

      if (!mark.label) {
        return;
      }

      /*
       * The label sits on the far side of the dot from the origin, so it never
       * lands on the arm or on the axis cross.
       */
      ctx.fillStyle = active ? '#fff' : 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = mark.re < 0 ? 'right' : 'left';
      ctx.textBaseline = mark.im < 0 ? 'top' : 'bottom';
      ctx.fillText(mark.label, px + (mark.re < 0 ? -8 : 8), py + (mark.im < 0 ? 8 : -8));
    });
  }
}
