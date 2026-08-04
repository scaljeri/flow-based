import { ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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
export abstract class TimeseriesView implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('plot') plot?: ElementRef<HTMLCanvasElement>;

  worker!: TimeseriesWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as TimeseriesWorker;

    this.subscription = this.worker.getStream().subscribe(() => {
      this.draw();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get latest(): string {
    const value = this.worker?.values[this.worker.values.length - 1];

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
    const values = this.worker.values;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (values.length < 2) {
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pad = 6;

    const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

    ctx.strokeStyle = '#bada55';
    ctx.fillStyle = 'rgba(186, 218, 85, 0.35)';
    ctx.lineWidth = 2;

    if (this.style === 'bars') {
      const barWidth = Math.max(1, (width - pad * 2) / values.length - 1);

      for (let i = 0; i < values.length; i++) {
        ctx.fillRect(x(i) - barWidth / 2, y(values[i]), barWidth, height - pad - y(values[i]));
      }

      return;
    }

    ctx.beginPath();
    values.forEach((v, i) => ctx.lineTo(x(i), y(v)));
    ctx.stroke();

    if (this.style === 'area') {
      ctx.lineTo(x(values.length - 1), height - pad);
      ctx.lineTo(x(0), height - pad);
      ctx.closePath();
      ctx.fill();
    }
  }
}
