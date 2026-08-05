import { Component } from '@angular/core';
import { MapView } from './map-view';

/** Opened in place: the map at panel size, and it takes the gestures. */
@Component({
  standalone: true,
  selector: 'fb-map-normal',
  template: `<div #canvas class="canvas"></div>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: block;
      height: 300px;
      padding: 6px;
      width: 320px;
    }

    .canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      height: 100%;
      width: 100%;
    }
  `]
})
export class MapNormalComponent extends MapView {
  protected override readonly interactive = true;
}
