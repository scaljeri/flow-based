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

  constructor(@Host() private service: NodeService) {
  }

  ngOnInit() {
    this.worker = this.service.worker as CanvasWorker;
  }

  drawCurve(curve): void {
    this.ctx.clearRect(0, 0, 800, 800);
    this.ctx.beginPath();
    this.ctx.moveTo(curve.data[0], curve.data[1]);
    for (let i = 2; i < curve.data.length; i += 2) {
      this.ctx.lineTo(curve.data[i], curve.data[i + 1]);
    }

    this.ctx.lineWidth = 10;
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.stroke();
  }

  drawText(item): void {
    this.ctx.fillStyle = '#fff';
    this.ctx['font'] = 'bold 32px serif';
    item.data.forEach(text => {
      this.ctx.fillText(text.value, text.x, text.y);
    });
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');

    this.worker.imageData$.subscribe((input: any) => {
      if (!input) {
        return;
      }

      this.canvas.nativeElement.width = 800;
      this.canvas.nativeElement.height = 800;

      input.forEach(item => {
        if (item.type === 'curve') {
          this.drawCurve(item);
        } else if (item.type === 'image-data') {
          this.ctx.putImageData(input, 0, 0);
        } else if (item.type === 'text') {
          this.drawText(item);
        }
      });
    });
  }
}
