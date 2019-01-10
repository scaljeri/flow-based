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

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');

    this.worker.imageData$.subscribe((input: any) => {
      if (!input) {
        return;
      }

      this.canvas.nativeElement.width = 800;
      this.canvas.nativeElement.height = 800;


      if (!input.type) { // ImageData
        this.ctx.putImageData(input, 0, 0);
      } else { // type: 'curve'
        this.ctx.clearRect(0, 0, 800, 800);
        const vals = input.data;
        this.ctx.beginPath();
        this.ctx.moveTo(vals[0], vals[1]);
        for (let i = 2; i < vals.length; i += 2) {
          this.ctx.lineTo(vals[i], vals[i + 1]);
        }
        this.ctx.lineWidth = 10;
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.stroke();
      }
    });
  }

}
