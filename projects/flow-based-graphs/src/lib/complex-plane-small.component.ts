import { Component } from '@angular/core';
import { ComplexPlaneView } from './complex-plane-view';

/** At rest: the trajectory itself, tiny — a spiral is its own best icon. */
@Component({
  standalone: true,
  selector: 'fb-complex-plane-small',
  template: `<canvas #plot></canvas>`,
  styles: [`
    :host {
      display: block;
      line-height: 0;
      padding: 6px;
    }

    canvas {
      height: 96px;
      width: 96px;
    }
  `]
})
export class ComplexPlaneSmallComponent extends ComplexPlaneView {
}
