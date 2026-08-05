import { Component } from '@angular/core';
import { MapView } from './map-view';

/** The whole surface: the map is the node now. */
@Component({
  standalone: true,
  selector: 'fb-map-full',
  template: `<div #canvas class="canvas"></div>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: block;
      height: 100%;
      padding: 6px;
      width: 100%;
    }

    .canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      height: 100%;
      width: 100%;
    }
  `]
})
export class MapFullComponent extends MapView {
  protected override readonly interactive = true;
}
