import { Component } from '@angular/core';
import { TapView } from './tap-view';

/**
 * The logger at rest: the reading, and nothing else.
 *
 * Its size is its own — a fixed width so a stream of changing numbers does not
 * make the node breathe, and no height at all beyond the line it draws. The shell
 * imposes neither; it follows whatever this comes out as.
 */
@Component({
  standalone: false,
  selector: 'fb-tap-small',
  template: `<span class="reading">{{value}}</span>`,
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
