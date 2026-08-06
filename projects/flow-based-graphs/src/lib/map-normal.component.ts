import { Component } from '@angular/core';
import { FB_DRAG_IGNORE } from '@scaljeri/flow-based';
import { MapView } from './map-view';

/** Opened in place: the map at panel size, and it takes the gestures. */
@Component({
  standalone: true,
  selector: 'fb-map-normal',
  /*
   * The canvas opts out of the shell's dragging, and that is what makes this
   * view usable: a press here is a pan of the MAP. The two gestures are the
   * same gesture, so one of them has to give — and a map you cannot pan is not
   * a map, while a node can still be picked up by its header, which this view
   * has and the small one does not.
   */
  template: `<div #canvas class="canvas ${FB_DRAG_IGNORE}"></div>`,
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
