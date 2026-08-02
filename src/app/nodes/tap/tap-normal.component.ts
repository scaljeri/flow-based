import { Component } from '@angular/core';
import { TapView } from './tap-view';

/**
 * The logger opened in place: the reading, how many there have been, and the
 * last few.
 *
 * Deliberately not the full one shrunk. This is the size you open a node to
 * while you are looking at the graph around it, so it is a panel next to other
 * nodes rather than a page — a few hundred pixels, and a history you can take in
 * at a glance instead of all 33 the worker keeps.
 */
@Component({
  standalone: false,
  selector: 'fb-tap-normal',
  template: `
    <div class="reading">
      <span class="value">{{value}}</span>
      <span class="count">{{count}} received</span>
    </div>

    <ol class="history">
      <li *ngFor="let entry of history | slice:0:8">{{entry}}</li>
    </ol>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px 8px;
      width: 200px;
    }

    .reading {
      align-items: baseline;
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }

    .value {
      font-size: 28px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .count {
      flex: 0 0 auto;
      font-size: 11px;
      opacity: 0.6;
    }

    .history {
      display: flex;
      flex-wrap: wrap;
      font-size: 11px;
      gap: 4px 8px;
      list-style: none;
      margin: 0;
      opacity: 0.75;
      padding: 0;
    }

    .history:empty::after {
      content: 'nothing yet';
      opacity: 0.5;
    }
  `]
})
export class TapNormalComponent extends TapView {
}
