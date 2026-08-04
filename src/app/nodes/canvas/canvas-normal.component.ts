import { Component } from '@angular/core';
import { CanvasView } from './canvas-view';

/** Opened in place: the drawing at panel size. */
@Component({
  standalone: false,
  selector: 'fb-canvas-normal',
  template: `<canvas #canvas></canvas>`,
  styles: [`
    :host {
      display: block;
      line-height: 0;
    }

    canvas {
      border-radius: 8px;
      height: 320px;
      width: 320px;
    }
  `]
})
export class CanvasNormalComponent extends CanvasView {
}
