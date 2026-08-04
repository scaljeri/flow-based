import { Component } from '@angular/core';
import { TimeseriesView } from './timeseries-view';

/** Opened in place: the plot at panel size. */
@Component({
  standalone: true,
  selector: 'fb-timeseries-normal',
  template: `
    @if (title) {
      <p class="plot-title">{{title}}</p>
    }
    <canvas #plot></canvas>
  `,
  styles: [`
    :host {
      display: block;
      line-height: 0;
      padding: 6px;
    }

    .plot-title {
      color: rgba(255, 255, 255, 0.9);
      font: 12px system-ui, sans-serif;
      line-height: normal;
      margin: 0 0 4px;
      text-align: center;
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
  protected override readonly axes = true;

}
