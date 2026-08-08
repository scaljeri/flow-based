import { Component } from '@angular/core';
import { TimeseriesView } from './timeseries-view';

/** The whole surface; the bitmap follows the element per draw, so it fills. */
@Component({
  standalone: true,
  selector: 'fb-timeseries-full',
  template: `
    <div class="wrap">
      @if (title) {
        <p class="plot-title">{{title}}</p>
      }
      <canvas #plot></canvas>
    </div>
  `,
  styles: [`
    :host {
      box-sizing: border-box;
      display: flex;
      height: 100%;
      line-height: 0;
      padding: 10px;
      width: 100%;
    }

    .wrap {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .plot-title {
      color: rgba(255, 255, 255, 0.9);
      font: 13px system-ui, sans-serif;
      line-height: normal;
      margin: 0 0 6px;
      text-align: center;
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
  protected override readonly legend = true;
  protected override readonly axes = true;

}
