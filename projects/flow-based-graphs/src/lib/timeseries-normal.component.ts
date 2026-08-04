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
    /*
     * A DEFAULT size, not a fixed one: the type is resizable, so when the
     * node carries a user-given size this host is stretched to it (the shell
     * sets 100% on the slotted chain) and the flexible canvas follows.
     */
    :host {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      line-height: 0;
      padding: 6px;
      width: 320px;
    }

    .plot-title {
      color: rgba(255, 255, 255, 0.9);
      flex: 0 0 auto;
      font: 12px system-ui, sans-serif;
      line-height: normal;
      margin: 0 0 4px;
      text-align: center;
    }

    canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      flex: 1 1 190px;
      min-height: 190px;
      width: 100%;
    }

    :host-context([sized]) canvas {
      min-height: 0;
    }
  `]
})
export class TimeseriesNormalComponent extends TimeseriesView {
  protected override readonly axes = true;

}
