import { Component } from '@angular/core';
import { MandelbrotView } from './mandelbrot-view';

/** At rest: the shape, small. It is recognisable at any size, which is rare. */
@Component({
  standalone: true,
  selector: 'fb-mandelbrot-small',
  template: `<canvas #plot></canvas>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: block;
      line-height: 0;
      padding: 6px;
    }

    canvas {
      background: #000;
      border-radius: 6px;
      height: 96px;
      width: 96px;
    }
  `]
})
export class MandelbrotSmallComponent extends MandelbrotView {
}
