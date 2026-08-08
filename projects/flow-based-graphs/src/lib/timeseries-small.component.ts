import { Component } from '@angular/core';
import { TimeseriesView } from './timeseries-view';

/** At rest: a sparkline — the shape of the recent past, no axes, no chrome. */
@Component({
  standalone: true,
  selector: 'fb-timeseries-small',
  template: `
    <canvas #plot></canvas>
    @if (waiting) {
      <span class="waiting">nothing yet</span>
    } @else {
      <span class="latest">{{latest}}</span>
    }
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 11px system-ui, sans-serif;
      gap: 2px;
      padding: 6px 8px;
    }

    canvas {
      height: 36px;
      width: 110px;
    }

    .latest {
      font-variant-numeric: tabular-nums;
      opacity: 0.7;
    }

    .waiting {
      font-style: italic;
      opacity: 0.45;
    }
  `]
})
export class TimeseriesSmallComponent extends TimeseriesView {
}
