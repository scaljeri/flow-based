import { Component } from '@angular/core';
import { TimeseriesView } from './timeseries-view';

/** Opened in place: the plot at panel size. */
@Component({
  standalone: true,
  selector: 'fb-timeseries-normal',
  template: `<canvas #plot></canvas>`,
  styles: [`
    :host {
      display: block;
      line-height: 0;
      padding: 6px;
    }

    canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      height: 190px;
      width: 320px;
    }
  `]
})
export class TimeseriesNormalComponent extends TimeseriesView {
}
