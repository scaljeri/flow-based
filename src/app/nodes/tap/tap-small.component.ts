import { Component } from '@angular/core';
import { TapView } from './tap-view';

/**
 * The logger at rest: the reading, and nothing else.
 *
 * Its size is its own — a fixed width so a stream of changing numbers does not
 * make the node breathe, and no height at all beyond the line it draws. The shell
 * imposes neither; it follows whatever this comes out as.
 *
 * One line, so a value that is not one says what it is instead: `object`, or an
 * array with its length. Open the node to see inside it — that is what the
 * bigger views are for.
 */
@Component({
  standalone: false,
  selector: 'fb-tap-small',
  template: `<span class="reading">{{short}}</span>`,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      justify-content: center;
      width: 70px;
    }

    .reading {
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class TapSmallComponent extends TapView {
}
