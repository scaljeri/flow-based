import { Component } from '@angular/core';
import { TapView } from './tap-view';

/**
 * The logger with the surface to itself: the reading big enough to read across a
 * room, the count, and the whole history the worker keeps.
 *
 * This one sizes itself to 100% rather than to a number of pixels, which is what
 * `full` means — the shell gives it the surface and it fills it.
 *
 * A structured value takes the whole left-hand panel and scrolls in it. At this
 * size a 64px reading of the word "object" would be the least useful thing on
 * screen: there is room for the value itself, so it gets shown.
 */
@Component({
  standalone: true,
  selector: 'fb-tap-full',
  template: `
    <section class="current">
      <h2>Current value</h2>

      <!--
        Opted out of dragging and allowed to pan: inside this box a finger
        scrolls the text. The node sets touch-action: none for its own drag,
        so this has to say otherwise.
      -->
      @if (structured) {
        <pre class="whole fb-drag-ignore">{{pretty}}</pre>
      } @else {
        <p class="value">{{short}}</p>
      }

      <p class="count">{{count}} values received</p>
    </section>

    <section class="history">
      <h2>History</h2>
      <ol>
        @for (entry of history; track $index) {
          <li>{{label(entry)}}</li>
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
      flex: 0 0 auto;
      margin: 8px 0 0;
      opacity: 0.6;
    }

    .whole {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      flex: 1;
      font: 13px/1.5 ui-monospace, monospace;
      margin: 0;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 10px 12px;
      touch-action: pan-y;
      white-space: pre;
    }

    /*
     * On a narrow screen the two panels stop being columns. Side by side, a
     * phone gives each about 180px — too little to read a value in, and half
     * of it spent on a history that is usually one line.
     */
    @media (max-width: 700px) {
      :host {
        flex-direction: column;
      }

      /*
       * A share each, not "as much as the content wants". Sized from its
       * content, the value pushed the history off the bottom of the screen —
       * where it is not smaller, it is gone.
       */
      .current {
        flex: 1 1 0;
      }

      .history {
        flex: 0 0 25%;
      }
    }

    ol {
      columns: 4;
      /* Long enough to be worth the column rule; ellipsis rather than reflow. */
      overflow-x: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
