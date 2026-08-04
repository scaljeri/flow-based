import { Component } from '@angular/core';
import { BasicGraphChart } from './basic-graph-chart';

/** The whole surface. The chart redraws per tick, so it follows the room. */
@Component({
  standalone: false,
  selector: 'fb-basic-graph-full',
  template: `<div #graph class="chart"></div>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: flex;
      height: 100%;
      padding: 10px;
      width: 100%;
    }

    .chart {
      background: #fff;
      border-radius: 8px;
      flex: 1;
      min-height: 0;
    }
  `]
})
export class BasicGraphFullComponent extends BasicGraphChart {
}
