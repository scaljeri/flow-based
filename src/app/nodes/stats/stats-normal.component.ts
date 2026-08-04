import { Component } from '@angular/core';
import { StatsView } from './stats-view';

/**
 * Opened in place: the three numbers and the reset, sized as a panel among
 * other nodes. The distribution chart is deliberately not here — it needs room
 * to be readable, and the full view is where the room is.
 */
@Component({
  standalone: false,
  selector: 'fb-stats-normal',
  template: `
    <div class="row"><span class="label">Min</span><span class="value">{{min}}</span></div>
    <div class="row"><span class="label">Max</span><span class="value">{{max}}</span></div>
    <div class="row"><span class="label">Average</span><span class="value">{{avg}}</span></div>
    <button fbNoDrag (click)="onReset()">Reset</button>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 13px system-ui, sans-serif;
      gap: 8px;
      padding: 10px 12px;
      width: 200px;
    }

    .row {
      display: flex;
      justify-content: space-between;
    }

    .label {
      opacity: 0.6;
    }

    .value {
      font-size: 15px;
      font-variant-numeric: tabular-nums;
    }

    button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      margin-top: 2px;
      padding: 6px 0;
    }
  `]
})
export class StatsNormalComponent extends StatsView {
}
