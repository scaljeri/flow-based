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
  ngAfterViewInit(): void {
    this.draw();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get latest(): string {
    const points = this.worker?.buffer.points;
    const value = points?.[points.length - 1]?.[1];

    return value === undefined ? '' : Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  protected get style(): TimeseriesStyle {
    return this.service.state.config?.style ?? 'line';
  }

  protected draw(): void {
    const canvas = this.plot?.nativeElement;

    if (!canvas) {
      return;
    }

    // Match the bitmap to the element, so the line is crisp at every size.
    const rect = canvas.getBoundingClientRect();

    if (rect.width && (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height))) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
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
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs);
    const spanX = Math.max(...xs) - minX || 1;
    const minY = Math.min(...ys);
    const spanY = Math.max(...ys) - minY || 1;
    const pad = 6;

    const x = (v: number) => pad + ((v - minX) / spanX) * (width - pad * 2);
    const y = (v: number) => height - pad - ((v - minY) / spanY) * (height - pad * 2);

    ctx.strokeStyle = '#bada55';
    ctx.fillStyle = 'rgba(186, 218, 85, 0.35)';
    ctx.lineWidth = 2;

    if (this.style === 'bars') {
      const barWidth = Math.max(1, (width - pad * 2) / points.length - 1);

      for (const point of points) {
        ctx.fillRect(x(point[0]) - barWidth / 2, y(point[1]), barWidth, height - pad - y(point[1]));
      }

      return;
    }

    ctx.beginPath();
    points.forEach(point => ctx.lineTo(x(point[0]), y(point[1])));
    ctx.stroke();

    if (this.style === 'area') {
      ctx.lineTo(x(points[points.length - 1][0]), height - pad);
      ctx.lineTo(x(points[0][0]), height - pad);
      ctx.closePath();
      ctx.fill();
    }
  }
}
