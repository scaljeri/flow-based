import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TimeseriesWorker } from './timeseries.worker';

export type TimeseriesStyle = 'line' | 'area' | 'bars';

/**
 * The plot itself, drawn straight onto a canvas.
 *
 * Plain 2D drawing rather than a chart library: a rolling line at up to a few
 * ticks a second redraws far below any budget, and the module stays
 * self-contained. The representation comes from config, where the settings
 * panel writes it.
 */
/**
 * Round tick values strictly INSIDE [min, max], on a 1/2/5×10^k step.
 *
 * Strictly inside, because the ends are drawn separately as the exact bounds —
 * a tick on top of an end label would print the same place twice. Returns few
 * or none when the range is too tight for a single nice step, which is the
 * honest answer for a tiny plot.
 */
function niceTicks(min: number, max: number, maxCount: number): number[] {
  const span = max - min;

  if (!(span > 0) || maxCount < 1) {
    return [];
  }

  const rough = span / (maxCount + 1);
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map(m => m * power).find(s => span / s <= maxCount + 1) ?? 10 * power;

  const ticks: number[] = [];
  const margin = span * 0.06;

  for (let v = Math.ceil(min / step) * step; v < max; v += step) {
    // Skip ticks hugging the ends; the exact bounds already stand there.
    if (v - min > margin && max - v > margin) {
      ticks.push(Number(v.toPrecision(12)));
    }
  }

  return ticks;
}

@Directive()
export abstract class TimeseriesView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('plot') plot?: ElementRef<HTMLCanvasElement>;

  worker!: TimeseriesWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as TimeseriesWorker;

    this.subscription = this.worker?.getStream().subscribe(() => {
      this.draw();
      this.cdr.detectChanges();
    });
  }

  /**
   * Draw what the buffer already holds, immediately.
   *
   * The stream only says "something arrived", so a view mounted BETWEEN
   * arrivals — opening the node from small to normal — showed an empty plot
   * until the next tick. In sweep mode there is no next tick: the whole
   * array came once, and the reopened plot stayed empty for good.
   */
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.draw();
    this.cdr.detectChanges();

    // A user-resized node changes the canvas without a new sample arriving;
    // the plot must follow the room it is given, not wait for data.
    const canvas = this.plot?.nativeElement;

    if (canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(canvas);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  get latest(): string {
    const points = this.worker?.buffer.points;
    const value = points?.[points.length - 1]?.[1];

    return value === undefined ? '' : Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  protected get style(): TimeseriesStyle {
    return this.service.state.config?.style ?? 'line';
  }

  /** The open views draw axes; the sparkline stays bare. */
  protected readonly axes: boolean = false;

  /** The series' own title, for the open views to put above the plot. */
  get title(): string {
    return this.worker?.buffer.labels?.title ?? '';
  }

  protected draw(): void {
    const canvas = this.plot?.nativeElement;

    if (!canvas) {
      return;
    }

    /*
     * Match the bitmap to the LAYOUT size, so the line is crisp at every
     * size. clientWidth, not getBoundingClientRect: the node lives on a
     * zoomed plane, and the bounding rect is scaled by that zoom — measured
     * through it, a zoomed-out plot got a miniature bitmap that the layout
     * then stretched back up into a blur of overlapping labels.
     */
    const layoutW = canvas.clientWidth;
    const layoutH = canvas.clientHeight;

    if (layoutW && (canvas.width !== layoutW || canvas.height !== layoutH)) {
      canvas.width = layoutW;
      canvas.height = layoutH;
    }

    const ctx = canvas.getContext('2d')!;
    const { points } = this.worker.buffer;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (points.length < 2) {
      return;
    }

    /*
     * Both axes scale to the DATA. For time readings the x's are arrival
     * indices and this is what it always did; for function samples the x's
     * are real coordinates, so f(x) = x^2 draws as the parabola it is rather
     * than as y-values marching along in arrival order.
     */
    const xs = points.map(p => p[0]);
    // Complex samples carry [x, re, im]; BOTH series set the y-range, or the
    // imaginary line walks off the top of the plot.
    const complex = points.some(p => p.length > 2);
    const ys = complex
      ? points.flatMap(p => [p[1], p[2] ?? p[1]])
      : points.map(p => p[1]);
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

    ctx.strokeStyle = '#bada55';
    ctx.fillStyle = 'rgba(186, 218, 85, 0.35)';
    ctx.lineWidth = 2;

    if (this.style === 'bars') {
      const barWidth = Math.max(1, (width - left - pad) / points.length - 1);

      for (const point of points) {
        ctx.fillRect(x(point[0]) - barWidth / 2, y(point[1]), barWidth, height - bottom - y(point[1]));
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

    /*
     * The imaginary part, as its own line in the point colour. Two labelled
     * strokes in the corner say which is which — a complex series without a
     * legend is two anonymous wiggles.
     */
    if (complex) {
      ctx.strokeStyle = '#9988cf';
      ctx.beginPath();
      points.forEach(point => ctx.lineTo(x(point[0]), y(point[2] ?? 0)));
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
