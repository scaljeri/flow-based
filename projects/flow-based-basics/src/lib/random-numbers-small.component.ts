import { Component } from '@angular/core';
import { RandomNumbersView } from './random-numbers-view';

/** At rest: the number, and nothing that needs explaining. */
@Component({
  standalone: true,
  selector: 'fb-random-numbers-small',
  template: `<span class="reading">{{currentValue}}</span>`,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      justify-content: center;
      /* Fixed, so a stream of changing numbers does not make the node breathe. */
      width: 76px;
    }

    .reading {
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class RandomNumbersSmallComponent extends RandomNumbersView {
}
