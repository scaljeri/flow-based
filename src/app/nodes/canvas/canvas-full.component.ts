import { Component } from '@angular/core';
import { CanvasView } from './canvas-view';

/** The whole surface; the square drawing takes the smaller side. */
@Component({
  standalone: false,
  selector: 'fb-canvas-full',
  template: `<canvas #canvas></canvas>`,
  styles: [`
    :host {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      height: 100%;
      justify-content: center;
      line-height: 0;
      padding: 10px;
      width: 100%;
    }

    canvas {
      border-radius: 8px;
      height: min(80vmin, 100%);
      width: min(80vmin, 100%);
    }
  `]
})
export class CanvasFullComponent extends CanvasView {
}
