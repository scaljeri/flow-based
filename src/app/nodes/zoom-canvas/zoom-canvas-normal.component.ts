import { Component } from '@angular/core';
import { ZoomCanvasView } from './zoom-canvas-view';

/** Opened in place: the picture with its readings, at panel size. */
@Component({
  standalone: false,
  selector: 'fb-zoom-canvas-normal',
  templateUrl: './zoom-canvas-open.component.html',
  styleUrls: ['./zoom-canvas-open.component.scss'],
  styles: [`
    :host {
      display: block;
      width: 320px;
    }

    canvas {
      height: 320px;
      width: 320px;
    }
  `]
})
export class ZoomCanvasNormalComponent extends ZoomCanvasView {
}
