import { Component } from '@angular/core';
import { BasicGraphView } from './basic-graph-view';

/** At rest: the latest value. The line itself needs room; open the node. */
@Component({
  standalone: false,
  selector: 'fb-basic-graph-small',
  template: `<span class="reading">{{lastValue}}</span>`,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      font: 16px system-ui, sans-serif;
      justify-content: center;
      width: 90px;
    }

    .reading {
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class BasicGraphSmallComponent extends BasicGraphView {
}
