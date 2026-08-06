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
 *
 * This is also the first size that can show a value that is not a number. A
 * structured value gets the whole panel and scrolls inside it; the node is
 * resizable, so how much of it you see at once is the reader's call.
 */
@Component({
  standalone: false,
  selector: 'fb-tap-normal',
  template: `
    <div class="reading">
      <!--
        The word "object" in 28px above the object itself says nothing twice.
        A one-line value keeps its line; a structured one is its own heading.
      -->
      @if (!structured) {
        <span class="value">{{short}}</span>
      }

      <span class="count">{{count}} received</span>
    </div>

    <!--
      Opted out of dragging, and allowed to pan vertically: a finger inside it
      is scrolling this text, not moving the node. The node sets
      touch-action: none for its own drag, so this has to say otherwise or
      there is no way to reach the bottom of a long value on a phone.
    -->
    @if (structured) {
      <pre class="whole fb-drag-ignore">{{pretty}}</pre>
    } @else {
      <ol class="history">
        @for (entry of history | slice:0:8; track $index) {
          <li>{{label(entry)}}</li>
        }
      </ol>
    }
    `,
  styles: [`
    :host {
      box-sizing: border-box;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 6px;
      /* Both, or a long value stretches the node instead of scrolling in it. */
      min-height: 0;
      overflow: hidden;
      padding: 6px 8px;
      width: 200px;
    }

    .reading {
      align-items: baseline;
      display: flex;
      flex: 0 0 auto;
      gap: 8px;
      /* Right-aligned on its own, which is where the count already sits. */
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

    .whole {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      flex: 1;
      font: 11px/1.45 ui-monospace, monospace;
      margin: 0;
      /* A height of its own until the node is resized, and never taller. */
      max-height: 220px;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 6px 8px;
      touch-action: pan-y;
      white-space: pre;
    }
  `]
})
export class TapNormalComponent extends TapView {
}
