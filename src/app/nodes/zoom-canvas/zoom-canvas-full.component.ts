import { Component } from '@angular/core';
import { ZoomCanvasView } from './zoom-canvas-view';

/**
 * The whole surface. The bitmap keeps the worker's resolution; only the
 * element grows, and the square stays square by taking the smaller side.
 */
@Component({
  standalone: false,
  selector: 'fb-zoom-canvas-full',
  templateUrl: './zoom-canvas-open.component.html',
  styleUrls: ['./zoom-canvas-open.component.scss'],
  styles: [`
    :host {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      height: 100%;
      justify-content: center;
      padding: 10px;
      width: 100%;
    }

    canvas {
      height: min(80vmin, 100%);
      width: min(80vmin, 100%);
    }
  `]
})
export class ZoomCanvasFullComponent extends ZoomCanvasView {
}
