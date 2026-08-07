import { Component } from '@angular/core';
import { MandelbrotView } from './mandelbrot-view';

/** The whole surface: the detail is the point, so give it every pixel. */
@Component({
  standalone: true,
  selector: 'fb-mandelbrot-full',
  template: `<canvas #plot [class]="dragIgnore" (pointerdown)="onPress($event)"></canvas>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: block;
      height: 100%;
      line-height: 0;
      padding: 6px;
      width: 100%;
    }

    canvas {
      background: #000;
      border-radius: 8px;
      cursor: crosshair;
      height: 100%;
      touch-action: none;
      width: 100%;
    }
  `]
})
export class MandelbrotFullComponent extends MandelbrotView {
  protected override readonly interactive = true;
}
