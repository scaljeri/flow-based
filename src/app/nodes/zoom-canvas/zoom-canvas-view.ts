import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { ZoomCanvasWorker } from '../../workers/zoom-canvas';
import { IDimensions, IZoomable } from '../../app.models';

/**
 * The fractal image and the zoom interaction, shared by every size of it.
 *
 * The views differ only in how big the canvas is ON SCREEN; the bitmap keeps
 * the worker's resolution. Pointer coordinates are therefore mapped through the
 * ACTUAL ratio of bitmap to element — the old code multiplied by the global
 * pixel-ratio constant, which was only right at the one CSS size it happened
 * to be written for.
 */
@Directive()
export abstract class ZoomCanvasView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  label = '';
  // Only read behind the template's *ngIf="dimensions", which appears after
  // the first worker emission.
  dimensions!: IDimensions;

  private worker!: ZoomCanvasWorker;
  private ctx!: CanvasRenderingContext2D;
  private imageData!: ImageData;
  private subscription?: Subscription;

  private startX = 0;
  private startY = 0;
  private dragging = false;

  ngOnInit(): void {
    this.worker = this.service.worker as ZoomCanvasWorker;
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;

    this.subscription = this.worker.imageData$.subscribe((data: IZoomable) => {
      if (data) {
        this.label = data.metadata.label;
        this.canvas.nativeElement.width = data.metadata.dimensions.width!;
        this.canvas.nativeElement.height = data.metadata.dimensions.height!;
        this.ctx.putImageData(data.imageData, 0, 0);
        this.imageData = data.imageData;
        this.dimensions = data.metadata.dimensions;

        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Client coordinates to bitmap coordinates, whatever the element's size. */
  private toBitmap(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const scaleX = this.canvas.nativeElement.width / rect.width;
    const scaleY = this.canvas.nativeElement.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  onMouseDown(event: MouseEvent): void {
    const at = this.toBitmap(event);

    this.startX = at.x;
    this.startY = at.y;
    this.dragging = true;
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.imageData) {
      return;
    }

    this.dragging = false;

    const at = this.toBitmap(event);
    const distance = Math.pow(at.x - this.startX, 2) + Math.pow(at.y - this.startY, 2);

    if (distance > 20) {
      this.compute(at.x, at.y);
    } else {
      // The canvas swallows pointer events, so the shell never sees this
      // click; reporting it keeps double-click-to-close working in here.
      this.service.nodeIsClicked(event as PointerEvent);
      this.worker.updateDimensions(Object.assign({}, this.dimensions, {
        x: this.dimensions.xMin + (this.dimensions.xMax - this.dimensions.xMin) * at.x / this.dimensions.width!,
        y: this.dimensions.yMin + (this.dimensions.yMax - this.dimensions.yMin) * at.y / this.dimensions.height!,
      }));
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.dragging || !this.imageData) {
      return;
    }

    const at = this.toBitmap(event);

    this.ctx.putImageData(this.imageData, 0, 0);
    this.ctx.fillStyle = 'rgba(64,64,64,0.6)';
    this.ctx.strokeStyle = 'rgba(255,255,255,1.0)';
    this.ctx.fillRect(this.startX, this.startY, at.x - this.startX, at.y - this.startY);
    this.ctx.strokeRect(this.startX, this.startY, at.x - this.startX, at.y - this.startY);
  }

  private compute(endX: number, endY: number): void {
    let { xMin, xMax, yMin, yMax } = this.dimensions;
    const xScale = (xMax - xMin) / this.canvas.nativeElement.width;
    const yScale = (yMax - yMin) / this.canvas.nativeElement.height;

    const left = Math.min(this.startX, endX);
    const right = Math.max(this.startX, endX);
    const top = Math.min(this.startY, endY);
    const bottom = Math.max(this.startY, endY);

    xMax = xMin + right * xScale;
    xMin = xMin + left * xScale;
    yMax = yMin + bottom * yScale;
    yMin = yMin + top * yScale;

    const maxDistance = Math.max(xMax - xMin, yMax - yMin);
    const xMid = xMin + (xMax - xMin) / 2;
    const yMid = yMin + (yMax - yMin) / 2;

    xMax = xMid + maxDistance / 2;
    xMin = xMid - maxDistance / 2;
    yMax = yMid + maxDistance / 2;
    yMin = yMid - maxDistance / 2;

    this.worker.updateDimensions({
      xMin, xMax, yMin, yMax,
      width: this.canvas.nativeElement.width,
      height: this.canvas.nativeElement.height,
    });
  }

  getTitle(): string {
    return `Fractal: ${this.label || 'none'}`;
  }

  get zoom(): string {
    return this.dimensions.zoom!.toFixed(2);
  }

  get width(): number {
    return this.dimensions.xMax - this.dimensions.xMin;
  }
}
