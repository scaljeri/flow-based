import { Component } from '@angular/core';
import { ZoomCanvasView } from './zoom-canvas-view';

/** At rest: the picture itself, small — a live thumbnail beats a label. */
@Component({
  standalone: false,
  selector: 'fb-zoom-canvas-small',
  template: `
    <canvas #canvas
            (mousemove)="onMouseMove($event)"
            (mousedown)="onMouseDown($event)"
            (mouseup)="onMouseUp($event)"
            fbNoDrag></canvas>
  `,
  styles: [`
    :host {
      display: block;
      line-height: 0;
    }

    canvas {
      border-radius: 8px;
      cursor: default;
      height: 120px;
      width: 120px;
    }
  `]
})
export class ZoomCanvasSmallComponent extends ZoomCanvasView {
}
