import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TimeseriesWorker } from './timeseries.worker';

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
export abstract class ComplexPlaneView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('plot') plot?: ElementRef<HTMLCanvasElement>;

  worker!: TimeseriesWorker;

  private subscription?: Subscription;
  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    this.worker = this.service.worker as TimeseriesWorker;

    this.subscription = this.worker?.getStream().subscribe(() => {
      this.draw();
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.draw();
    this.cdr.detectChanges();

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

  get title(): string {
    return this.worker?.buffer.labels?.title ?? '';
  }

  /** The open views draw axes; the small view stays a bare trajectory. */
  protected readonly axes: boolean = false;

  protected draw(): void {
    const canvas = this.plot?.nativeElement;

    if (!canvas) {
      return;
    }

    // Layout size, never the zoom-scaled bounding rect; see the wave view.
    const layoutW = canvas.clientWidth;
    const layoutH = canvas.clientHeight;

    if (layoutW && (canvas.width !== layoutW || canvas.height !== layoutH)) {
      canvas.width = layoutW;
      canvas.height = layoutH;
    }

    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // A real-only series lives ON the real axis: im is simply 0.
    const points = this.worker.buffer.points.map(p => [p[1], p[2] ?? 0]);

    if (points.length < 2) {
      return;
    }

    const res = points.map(p => p[0]);
    const ims = points.map(p => p[1]);
    const pad = this.axes ? 26 : 6;

    /*
     * One scale, both axes: the largest span decides, centred on the data.
     * The circle stays a circle whatever shape the canvas has.
     */
    const midRe = (Math.min(...res) + Math.max(...res)) / 2;
    const midIm = (Math.min(...ims) + Math.max(...ims)) / 2;
    const span = Math.max(
      Math.max(...res) - Math.min(...res),
      Math.max(...ims) - Math.min(...ims),
    ) || 1;
    const scale = (Math.min(width, height) - pad * 2) / span;

    const x = (re: number) => width / 2 + (re - midRe) * scale;
    const y = (im: number) => height / 2 - (im - midIm) * scale;

    if (this.axes) {
      // The axes of the PLANE: the zero cross, wherever zero happens to be.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x(0), 0);
      ctx.lineTo(x(0), height);
      ctx.moveTo(0, y(0));
      ctx.lineTo(width, y(0));
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('re', width - 16, y(0) + 4);
      ctx.fillText('im', x(0) + 4, 2);
    }

    /*
     * The path fades toward its tail: a spiral crosses itself, and without a
     * direction cue the drawing is a tangle instead of a journey.
     */
    for (let i = 1; i < points.length; i++) {
      ctx.strokeStyle = `rgba(186, 218, 85, ${0.25 + 0.75 * (i / points.length)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x(points[i - 1][0]), y(points[i - 1][1]));
      ctx.lineTo(x(points[i][0]), y(points[i][1]));
      ctx.stroke();
    }

    // The head, marked: where the function is NOW.
    const head = points[points.length - 1];

    ctx.fillStyle = '#bada55';
    ctx.beginPath();
    ctx.arc(x(head[0]), y(head[1]), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
