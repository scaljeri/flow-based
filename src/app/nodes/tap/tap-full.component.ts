import { Component } from '@angular/core';
import { TapView } from './tap-view';

/**
 * The logger with the surface to itself: the reading big enough to read across a
 * room, the count, and the whole history the worker keeps.
 *
 * This one sizes itself to 100% rather than to a number of pixels, which is what
 * `full` means — the shell gives it the surface and it fills it.
 */
@Component({
  standalone: false,
  selector: 'fb-tap-full',
  template: `
    <section class="current">
      <h2>Current value</h2>
      <p class="value">{{value}}</p>
      <p class="count">{{count}} values received</p>
    </section>
    
    <section class="history">
      <h2>History</h2>
      <ol>
        @for (entry of history; track entry) {
          <li>{{entry}}</li>
        }
      </ol>
    </section>
    `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      gap: 16px;
      height: 100%;
      padding: 16px;
      width: 100%;
    }

    section {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      /* Both, or a long history stretches the panel instead of scrolling in it. */
      min-height: 0;
      overflow: hidden;
      padding: 16px;
    }

    .current {
      flex: 0 0 40%;
    }

    .history {
      flex: 1;
    }

    h2 {
      font-size: 12px;
      letter-spacing: 0.08em;
      margin: 0 0 12px;
      opacity: 0.6;
      text-transform: uppercase;
    }

    .value {
      font-size: 64px;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .count {
      margin: 8px 0 0;
      opacity: 0.6;
    }

    ol {
      columns: 4;
      font-size: 18px;
      list-style: none;
      margin: 0;
      overflow: auto;
      padding: 0;
    }
  `]
})
export class TapFullComponent extends TapView {
}
