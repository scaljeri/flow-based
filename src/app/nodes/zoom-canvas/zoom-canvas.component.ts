import { AfterViewInit, Component, ElementRef, Host, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { ZoomCanvasWorker } from '../../workers/zoom-canvas';
import { IDimensions, IZoomable, PIXEL_RATIO_SCALE } from '../../fb-config';

@Component({
  selector: 'fb-zoom-canvas',
  templateUrl: './zoom-canvas.component.html',
  styleUrls: ['./zoom-canvas.component.scss']
})
export class ZoomCanvasComponent implements OnInit, AfterViewInit {
  private worker: ZoomCanvasWorker;
  private label: string;
  private left: number;
  private top: number;
  private startX: number;
  private startY: number;
  private dragging = false;
  private ctx: any;
  private imageData: ImageData;
  private dimensions: IDimensions;
  private startTime: number;

  @ViewChild('canvas') canvas: ElementRef;

  constructor(@Host() private service: NodeService) {
  }

  ngOnInit() {
    this.worker = this.service.worker as ZoomCanvasWorker;

    this.worker.imageData$.subscribe((data: IZoomable) => {
      if (data) {
        this.label = data.metadata.label;
        this.canvas.nativeElement.width = data.metadata.dimensions.width;
        this.canvas.nativeElement.height = data.metadata.dimensions.height;
        this.ctx.putImageData(data.imageData, 0, 0);
        this.imageData = data.imageData;
        this.dimensions = data.metadata.dimensions;
      }
    });
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');

  }

  onMouseDown(event): void {
    const boundingRect = this.canvas.nativeElement.getBoundingClientRect();
    this.left = boundingRect.left;
    this.top = boundingRect.top;
    this.startX = (event.clientX - this.left) * PIXEL_RATIO_SCALE;
    this.startY = (event.clientY - this.top) * PIXEL_RATIO_SCALE;
    this.dragging = true;
    this.startTime = Date.now();
  }

  onMouseUp(event): void {
    this.dragging = false;
    const x = event.clientX;
    const y = event.clientY;

    const distance = Math.pow(x  - this.left - this.startX, 2) + Math.pow(y - this.top - this.startY, 2);
    const duration = Date.now() - this.startTime;

    if (distance > 20) {
      // if (duration > 500) {
        this.compute((event.clientX - this.left) * PIXEL_RATIO_SCALE,
          (event.clientY - this.top) * PIXEL_RATIO_SCALE);
      // }
    } else {
      this.service.nodeIsClicked(event);
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  compute(endX, endY): void {
    let { xMin, xMax, yMin, yMax }  = this.dimensions;
    const { x, y } = this.dimensions;
    const xScale = (xMax - xMin) / this.canvas.nativeElement.width;
    const yScale = (yMax - yMin) / this.canvas.nativeElement.height;
    const aspectRatio = this.canvas.nativeElement.width / this.canvas.nativeElement.height;

    // const width = (endX - this.startX) * SCALE;
    // const height = (endY - this.top - this.startY) * SCALE;

    const left = Math.min(this.startX, endX);
    const right = Math.max(this.startX, endX);
    const top = Math.min(this.startY, endY);
    const bottom = Math.max(this.startY, endY);

    // let width = right - left;
    // let height = bottom - top;
    //
    // if (width > height) {
    //   height = width / aspectRatio;
    // } else {
    //   width = height * aspectRatio;
    // }

    xMax = xMin + right * xScale;
    xMin = xMin + left * xScale;
    yMax = yMin + bottom * yScale;
    yMin = yMin + top * yScale;

    this.worker.updateDimensions({
        xMin, xMax, yMin, yMax, x, y,
        width: this.canvas.nativeElement.width,
        height: this.canvas.nativeElement.height
    });

  }

  onMouseMove(event): void {
    if (this.dragging) {
      const x = (event.clientX - this.left) * PIXEL_RATIO_SCALE ;
      const y = (event.clientY - this.top) * PIXEL_RATIO_SCALE;

      this.ctx.putImageData(this.imageData, 0, 0);
      this.ctx.fillStyle = 'rgba(64,64,64,0.6)';
      this.ctx.strokeStyle = 'rgba(255,255,255,1.0)';
      this.ctx.fillRect(this.startX, this.startY, x - this.startX, y - this.startY);
      this.ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
    }
  }

  getTitle(): string {
    return 'Fractal: ' + this.label ? this.label : 'none';
  }
}
