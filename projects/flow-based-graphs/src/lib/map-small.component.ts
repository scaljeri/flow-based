import { Component } from '@angular/core';
import { MapView } from './map-view';

/**
 * At rest: the places, no controls — a node is an icon until opened.
 *
 * The map takes no gestures here (see `interactive`), and deliberately does not
 * opt out of dragging either: at this size the drawing is a picture of where
 * the data is, and a press on it moves the node, which is the only thing a node
 * this small has to be able to do.
 */
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
