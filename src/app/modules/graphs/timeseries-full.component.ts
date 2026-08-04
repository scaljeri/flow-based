import { Component } from '@angular/core';
import { TimeseriesView } from './timeseries-view';

/** The whole surface; the bitmap follows the element per draw, so it fills. */
@Component({
  standalone: true,
  selector: 'fb-timeseries-full',
  template: `<canvas #plot></canvas>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: flex;
      height: 100%;
      line-height: 0;
      padding: 10px;
      width: 100%;
    }

    canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      flex: 1;
      min-height: 0;
    }
  `]
})
export class TimeseriesFullComponent extends TimeseriesView {
}
