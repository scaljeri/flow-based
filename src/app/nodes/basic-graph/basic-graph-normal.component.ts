import { Component } from '@angular/core';
import { BasicGraphChart } from './basic-graph-chart';

/** Opened in place: the line at panel size, which fits next to other nodes. */
@Component({
  standalone: false,
  selector: 'fb-basic-graph-normal',
  template: `<div #graph class="chart"></div>`,
  styles: [`
    :host {
      display: block;
      padding: 6px;
      width: 320px;
    }

    .chart {
      background: #fff;
      border-radius: 8px;
      height: 200px;
    }
  `]
})
export class BasicGraphNormalComponent extends BasicGraphChart {
}
