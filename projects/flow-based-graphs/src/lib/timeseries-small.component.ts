import { Component } from '@angular/core';
import { TimeseriesView } from './timeseries-view';

/**
 * At rest: the shape of the recent past, no axes, no chrome.
 *
 * Big enough to read, which for a plot means bigger than a sparkline. 110 by
 * 36 was fine for one wandering line and useless for the thing this plot now
 * also draws — a stack of eighteen bands over forty-five days is a smear at
 * that size, and a node you have to open to learn anything from is a node
 * that says nothing on the canvas.
 *
 * Still small: the complex plane's own resting view is 96 square, so this
 * stays in the same family rather than becoming a second normal view.
 */
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
      height: 68px;
      width: 152px;
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
