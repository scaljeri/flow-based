import { Component } from '@angular/core';
import { StatsView } from './stats-view';

/** At rest: the running range, and nothing else. */
@Component({
  standalone: false,
  selector: 'fb-stats-small',
  template: `
    <div class="row"><span class="label">min</span><span class="value">{{min}}</span></div>
    <div class="row"><span class="label">max</span><span class="value">{{max}}</span></div>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 4px;
      justify-content: center;
      padding: 6px 8px;
      /* Fixed, so a stream of changing numbers does not make the node breathe. */
      width: 118px;
    }

    .row {
      display: flex;
      justify-content: space-between;
    }

    .label {
      opacity: 0.6;
    }

    .value {
      font-variant-numeric: tabular-nums;
    }
  `]
})
export class StatsSmallComponent extends StatsView {
}
