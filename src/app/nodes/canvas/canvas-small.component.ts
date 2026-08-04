import { Component } from '@angular/core';
import { CanvasView } from './canvas-view';

/** At rest: a live thumbnail of the same bitmap the open views draw. */
@Component({
  standalone: false,
  selector: 'fb-canvas-small',
  template: `<canvas #canvas></canvas>`,
  styles: [`
    :host {
      display: block;
      line-height: 0;
    }

    canvas {
      border-radius: 8px;
      height: 110px;
      width: 110px;
    }
  `]
})
export class CanvasSmallComponent extends CanvasView {
}
