import { AfterViewInit, Component, ElementRef, Host, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { CanvasWorker } from '../../workers/canvas';

@Component({
  selector: 'fb-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvas: ElementRef;

  private worker: CanvasWorker;
  private ctx;

  constructor(@Host() private service: NodeService) { }

  ngOnInit() {
    this.worker = this.service.worker as CanvasWorker;
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');

    this.worker.imageData$.subscribe((pixels: ImageData) => {
      if (pixels) {
        this.canvas.nativeElement.width = 400;
        this.canvas.nativeElement.height = 400;
        this.ctx.putImageData(pixels, 0, 0);
      }
    });
  }

}
