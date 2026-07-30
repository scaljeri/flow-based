import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { CanvasWorker } from '../../workers/canvas';

/** Drawing instructions produced by the custom-code nodes upstream of this one. */
interface CurveInstruction {
  type: 'curve';
  data: number[];
}

interface TextInstruction {
  type: 'text';
  data: { x: number; y: number; value: string }[];
}

interface ImageDataInstruction {
  type: 'image-data';
  data: ImageData;
}

type DrawInstruction = CurveInstruction | TextInstruction | ImageDataInstruction;

@Component({
  standalone: false,
  selector: 'fb-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvas!: ElementRef;

  private worker!: CanvasWorker;
  private ctx!: CanvasRenderingContext2D;

  constructor(private service: NodeService) {
  }

  ngOnInit() {
    this.worker = this.service.worker as CanvasWorker;
  }

  drawCurve(curve: CurveInstruction): void {
    this.ctx.clearRect(0, 0, 800, 800);
    this.ctx.beginPath();
    this.ctx.moveTo(curve.data[0], curve.data[1]);
    for (let i = 2; i < curve.data.length; i += 2) {
      this.ctx.lineTo(curve.data[i], curve.data[i + 1]);
    }

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#fff';
    this.ctx.stroke();
  }

  drawText(item: TextInstruction): void {
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

      input.forEach((item: DrawInstruction) => {
        if (item.type === 'curve') {
          this.drawCurve(item);
        } else if (item.type === 'image-data') {
          // Was `putImageData(input, ...)` — the whole instruction array rather
          // than this instruction's payload.
          this.ctx.putImageData(item.data, 0, 0);
        } else if (item.type === 'text') {
          this.drawText(item);
        }
      });
    });
  }
}
