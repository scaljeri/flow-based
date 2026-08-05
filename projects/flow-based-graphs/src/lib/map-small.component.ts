import { Component } from '@angular/core';
import { MapView } from './map-view';

/** At rest: the places, no controls — a node is an icon until opened. */
@Component({
  standalone: true,
  selector: 'fb-map-small',
  template: `<div #canvas class="canvas"></div>`,
  styles: [`
    :host {
      display: block;
      height: 130px;
      padding: 6px;
      width: 170px;
    }

    .canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      height: 100%;
      width: 100%;
    }
  `]
})
export class MapSmallComponent extends MapView {
}
