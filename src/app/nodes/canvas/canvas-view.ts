import { AfterViewInit, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
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

/**
 * The drawing surface, shared by every size of it.
 *
 * The bitmap is always 800x800 — that is the coordinate space the upstream
 * code draws in — and the views scale the ELEMENT, so the small view is a live
 * thumbnail of exactly what the open one shows.
 */
@Directive()
export abstract class CanvasView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  private worker!: CanvasWorker;
  private ctx!: CanvasRenderingContext2D;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as CanvasWorker;
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;

    this.subscription = this.worker.imageData$.subscribe((input: any) => {
      if (!input) {
        return;
      }

      this.canvas.nativeElement.width = 800;
      this.canvas.nativeElement.height = 800;

      input.forEach((item: DrawInstruction) => {
        if (item.type === 'curve') {
          this.drawCurve(item);
        } else if (item.type === 'image-data') {
          this.ctx.putImageData(item.data, 0, 0);
        } else if (item.type === 'text') {
          this.drawText(item);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private drawCurve(curve: CurveInstruction): void {
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

  private drawText(item: TextInstruction): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 32px serif';
    item.data.forEach(text => {
      this.ctx.fillText(text.value, text.x, text.y);
    });
  }
}
