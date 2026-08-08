import { Directive } from '@angular/core';
import { Observable } from 'rxjs';
import { CanvasView } from './canvas-view';
import { BANDS, LAYER_COLOURS, LEGEND_COLUMN, LEGEND_ROW, legendHeight, niceTicks } from './plot-core';
import { SeriesBuffer, PlotWorker } from './plot.worker';

/**
 * What one reading is drawn AS.
 *
 * The four that recur in every plotting system worth copying — a point, a
 * line through them, the area under it, a bar standing on the axis. Everything
 * else those systems offer is one of these with a different encoding or a
 * transform applied before the plot: a histogram is bars after binning, a
 * heatmap is rectangles coloured by value, a stacked bar is bars over a
 * composition. Transforms belong in nodes upstream; this draws what arrives.
 */
export type PlotMark = 'line' | 'dots' | 'area' | 'bars';

/**
 * The plot itself, drawn straight onto a canvas.
 *
 * Plain 2D drawing rather than a chart library: a rolling line at up to a few
 * ticks a second redraws far below any budget, and the module stays
 * self-contained. The representation comes from config, where the settings
 * panel writes it.
 */
/**
 * A cartesian plot: one horizontal parameter, values against it.
 *
 * Plain 2D drawing rather than a chart library: a rolling line at up to a few
 * ticks a second redraws far below any budget, and the module stays
 * self-contained.
 */
@Directive()
export abstract class PlotView extends CanvasView {
  get worker(): PlotWorker {
    return this.service.worker as PlotWorker;
  }

  protected changes(): Observable<unknown> | undefined {
    return this.worker?.getStream();
  }

  get latest(): string {
    const points = this.worker?.buffer.points;
    const value = points?.[points.length - 1]?.[1];

    return value === undefined ? '' : Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  /**
   * Whether anything has arrived at all.
   *
   * A plot waiting for its first value draws an empty rectangle, which on a
   * canvas full of nodes reads as a node that is broken rather than one that
   * is ready. Saying so costs a word and answers the question a reader would
   * otherwise have to open the node to ask.
   */
  get waiting(): boolean {
    const buffer = this.worker?.buffer;

    return !buffer || (!buffer.points.length && !buffer.stack && !buffer.marks?.length);
  }

  protected get style(): PlotMark {
    return (this.worker?.mark ?? 'line') as PlotMark;
  }

  /** The open views draw axes; the sparkline stays bare. */
  protected readonly axes: boolean = false;

  /**
   * And a legend, which only the open views have room for.
   *
   * A stack of eighteen parts is unreadable without one — the bars say a
   * composition changed and nothing about what it is composed OF. At sparkline
   * size there is no room for eighteen names, and a legend squeezed into 110
   * pixels is worse than none: the shape still reads, and the reader who wants
   * the names opens the node.
   */
  protected readonly legend: boolean = false;

  /** The series' own title, for the open views to put above the plot. */
  get title(): string {
    return this.worker?.buffer.labels?.title ?? '';
  }

  protected draw(): void {
    const surface = this.surface();

    if (!surface) {
      return;
    }

    const { ctx, width, height } = surface;
    const layers = this.layersOf<SeriesBuffer>(this.worker, this.worker.buffer)
      .filter(layer => layer.stack || layer.points.length);

    ctx.clearRect(0, 0, width, height);

    /*
     * A composition is drawn differently from a quantity, and it arrives on
     * its own field, so it decides the drawing before anything else does.
     * One at a time: stacked bars from two sources on one pair of axes are
     * two totals drawn as one, which is a picture of nothing.
     */
    const stacked = layers.find(layer => layer.stack);

    if (stacked?.stack) {
      this.drawStack(ctx, stacked.stack, width, height);

      return;
    }

    const drawn = layers.filter(layer => layer.points.length > 1);

    if (!drawn.length) {
      return;
    }

    /*
     * Both axes scale to the DATA, across EVERY layer. For time readings the
     * x's are arrival indices and this is what it always did; for function
     * samples the x's are real coordinates, so f(x) = x^2 draws as the
     * parabola it is rather than as y-values marching along in arrival order.
     *
     * Over every layer, because layers only mean anything if they agree about
     * where a point is — two series measured differently are two pictures on
     * one canvas.
     */
    const all = drawn.flatMap(layer => layer.points);
    const xs = all.map(p => p[0]);
    // Complex samples carry [x, re, im]; BOTH series set the y-range, or the
    // imaginary line walks off the top of the plot.
    const complex = all.some(p => p.length > 2);
    const ys = complex
      ? all.flatMap(p => [p[1], p[2] ?? p[1]])
      : all.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const spanX = maxX - minX || 1;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanY = maxY - minY || 1;

    // Room for the axes when they are drawn; a hair of padding otherwise.
    const pad = 6;
    const left = this.axes ? 44 : pad;
    const bottom = this.axes ? 34 : pad;
    const top = this.axes ? 10 : pad;

    const x = (v: number) => left + ((v - minX) / spanX) * (width - left - pad);
    const y = (v: number) => height - bottom - ((v - minY) / spanY) * (height - bottom - top);

    if (this.axes) {
      this.drawAxes(ctx, { width, height, left, bottom, top, pad, minX, maxX, minY, maxY });
    }

    ctx.lineWidth = 2;

    drawn.forEach((layer, index) => {
      const points = layer.points;
      const colours = LAYER_COLOURS[index % LAYER_COLOURS.length];

      ctx.strokeStyle = colours.mark;
      ctx.fillStyle = this.style === 'dots' ? colours.mark : `rgba(${colours.path}, 0.35)`;

      if (this.style === 'bars') {
        const barWidth = Math.max(1, (width - left - pad) / points.length - 1);

        for (const point of points) {
          ctx.fillRect(x(point[0]) - barWidth / 2, y(point[1]), barWidth, height - bottom - y(point[1]));
        }

        return;
      }

      if (this.style === 'dots') {
        /*
         * A mark per reading and nothing between them. For a scatter this is
         * the honest drawing: a line between two points claims the values in
         * between, and a set of samples never made that claim.
         */
        const radius = Math.max(1.5, Math.min(3, (width - left - pad) / points.length / 2));

        for (const point of points) {
          ctx.beginPath();
          ctx.arc(x(point[0]), y(point[1]), radius, 0, Math.PI * 2);
          ctx.fill();
        }

        return;
      }

      ctx.beginPath();
      points.forEach(point => ctx.lineTo(x(point[0]), y(point[1])));
      ctx.stroke();

      if (this.style === 'area') {
        ctx.lineTo(x(points[points.length - 1][0]), height - bottom);
        ctx.lineTo(x(points[0][0]), height - bottom);
        ctx.closePath();
        ctx.fill();
      }
    });

    /*
     * The imaginary part, as its own line in the point colour. Two labelled
     * strokes in the corner say which is which — a complex series without a
     * legend is two anonymous wiggles.
     */
    if (complex) {
      ctx.strokeStyle = '#9988cf';
      ctx.beginPath();
      all.forEach(point => ctx.lineTo(x(point[0]), y(point[2] ?? 0)));
      ctx.stroke();

      if (this.axes) {
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#bada55';
        ctx.beginPath();
        ctx.moveTo(width - 58, top + 6);
        ctx.lineTo(width - 44, top + 6);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText('re', width - 40, top + 6);
        ctx.strokeStyle = '#9988cf';
        ctx.beginPath();
        ctx.moveTo(width - 58, top + 18);
        ctx.lineTo(width - 44, top + 18);
        ctx.stroke();
        ctx.fillText('im', width - 40, top + 18);
      }
    }
  }

  /**
   * Axes, end values, labels and the title — the words come from the series
   * itself (set at the formula, travelling with the samples), with f(x) and
   * x as the honest defaults for a series that never introduced itself.
   */
  /**
   * A stack of parts per step, drawn as one bar per step.
   *
   * The bars are the whole point: a line would need eighteen of them and no
   * reader can follow eighteen lines, while a stacked bar puts the total and
   * its composition in the same shape. Height is the total, and each band is
   * one part of it.
   *
   * The colours are assigned by POSITION in the label list, not by name.
   * Naming them would mean this module knowing what the labels mean, which is
   * exactly what it must not: a plot draws whatever arrives, and the file that
   * arrived is the only thing that knows whether band four is shipping or
   * Switzerland. Position is stable for as long as the source keeps its own
   * order, which is the same promise the labels themselves make.
   */
  private drawStack(
    ctx: CanvasRenderingContext2D,
    stack: { labels: string[]; rows: (number[] | null)[] },
    width: number,
    height: number,
  ): void {
    const rows = stack.rows;

    if (!rows.length) {
      return;
    }

    const totals = rows.map(row => (row ? row.reduce((sum, part) => sum + (part || 0), 0) : 0));
    const maxY = Math.max(...totals, 0) || 1;

    const pad = 6;
    const left = this.axes ? 44 : pad;
    const top = this.axes ? 10 : pad;
    const legend = this.legend ? legendHeight(stack.labels.length, width) : 0;
    const bottom = (this.axes ? 34 : pad) + legend;

    if (this.axes) {
      this.drawAxes(ctx, {
        width, height, left, bottom, top, pad,
        minX: 0, maxX: Math.max(1, rows.length - 1), minY: 0, maxY,
      });
    }

    const plotHeight = height - bottom - top;
    const slot = (width - left - pad) / rows.length;
    const barWidth = Math.max(1, slot - 1);

    rows.forEach((row, index) => {
      if (!row) {
        return;
      }

      const x = left + index * slot;
      let base = height - bottom;

      row.forEach((part, band) => {
        const value = part || 0;

        if (value <= 0) {
          return;
        }

        const bandHeight = (value / maxY) * plotHeight;

        ctx.fillStyle = BANDS[band % BANDS.length];
        ctx.fillRect(x, base - bandHeight, barWidth, bandHeight);
        base -= bandHeight;
      });
    });

    if (this.legend) {
      this.drawLegend(ctx, stack, totals, width, height, legend);
    }
  }

  /**
   * The names, with each one's share of the whole window.
   *
   * The share is what turns a legend into a reading. "Shipping" says which
   * band is which; "Shipping 11%" says what the picture is actually about,
   * and it is the number a person repeats afterwards.
   */
  private drawLegend(
    ctx: CanvasRenderingContext2D,
    stack: { labels: string[]; rows: (number[] | null)[] },
    totals: number[],
    width: number,
    height: number,
    legendHeight: number,
  ): void {
    const sums = stack.labels.map((_, band) =>
      stack.rows.reduce((sum, row) => sum + (row?.[band] || 0), 0));
    const whole = sums.reduce((sum, part) => sum + part, 0) || 1;
    const columns = Math.max(1, Math.floor(width / LEGEND_COLUMN));
    const columnWidth = width / columns;
    const top = height - legendHeight + 4;

    ctx.font = '9px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    stack.labels.forEach((label, band) => {
      const x = (band % columns) * columnWidth + 4;
      const y = top + Math.floor(band / columns) * LEGEND_ROW + LEGEND_ROW / 2;

      ctx.fillStyle = BANDS[band % BANDS.length];
      ctx.fillRect(x, y - 3, 6, 6);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(
        `${label} ${Math.round((sums[band] / whole) * 100)}%`,
        x + 10,
        y,
        columnWidth - 16,
      );
    });

    // Totals are read by drawStack for the y-range; naming the parameter keeps
    // the two in step if one of them ever stops being a plain sum.
    void totals;
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    m: { width: number; height: number; left: number; bottom: number; top: number; pad: number;
         minX: number; maxX: number; minY: number; maxY: number },
  ): void {
    const labels = this.worker.buffer.labels;
    const xLabel = labels?.x ?? (this.worker.buffer.xy ? 'x' : '');
    const yLabel = labels?.y ?? (this.worker.buffer.xy ? 'f(x)' : '');
    const axisY = m.height - m.bottom;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, sans-serif';

    ctx.beginPath();
    ctx.moveTo(m.left, m.top);
    ctx.lineTo(m.left, axisY);
    ctx.lineTo(m.width - m.pad, axisY);
    ctx.stroke();

    const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1);

    /*
     * Round intermediate values wherever there is room — a graph whose axes
     * only name their ends makes the reader interpolate everything between.
     * Ticks land on 1/2/5×10^k steps, as many as the pixels comfortably fit,
     * each with a whisper of a grid line.
     */
    const xTicks = niceTicks(m.minX, m.maxX, Math.max(2, Math.floor((m.width - m.left - m.pad) / 70) + 1));
    const yTicks = niceTicks(m.minY, m.maxY, Math.max(2, Math.floor((axisY - m.top) / 36) + 1));

    const xPos = (v: number) => m.left + ((v - m.minX) / (m.maxX - m.minX || 1)) * (m.width - m.left - m.pad);
    const yPos = (v: number) => axisY - ((v - m.minY) / (m.maxY - m.minY || 1)) * (axisY - m.top);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

    for (const tick of yTicks) {
      ctx.beginPath();
      ctx.moveTo(m.left, yPos(tick));
      ctx.lineTo(m.width - m.pad, yPos(tick));
      ctx.stroke();
    }

    for (const tick of xTicks) {
      ctx.beginPath();
      ctx.moveTo(xPos(tick), m.top);
      ctx.lineTo(xPos(tick), axisY);
      ctx.stroke();
    }

    ctx.restore();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const tick of yTicks) {
      ctx.fillText(fmt(tick), m.left - 4, yPos(tick));
    }

    // The ends stay: they are the honest bounds of what is on screen.
    ctx.fillText(fmt(m.maxY), m.left - 4, m.top + 4);
    ctx.fillText(fmt(m.minY), m.left - 4, axisY);

    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    for (const tick of xTicks) {
      ctx.fillText(fmt(tick), xPos(tick), axisY + 4);
    }

    ctx.textAlign = 'left';
    ctx.fillText(fmt(m.minX), m.left, axisY + 4);
    // Right-aligned, or half the number falls off the canvas edge.
    ctx.textAlign = 'right';
    ctx.fillText(fmt(m.maxX), m.width - m.pad, axisY + 4);
    ctx.textAlign = 'center';

    if (xLabel) {
      ctx.fillText(xLabel, m.left + (m.width - m.left - m.pad) / 2, axisY + 16);
    }

    if (yLabel) {
      ctx.save();
      ctx.translate(10, m.top + (axisY - m.top) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'middle';
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

  }
}
