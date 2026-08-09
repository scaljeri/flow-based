import { Component } from '@angular/core';
import { RandomNumbersView } from './random-numbers-view';

/**
 * Opened: nearly the same thing, said larger.
 *
 * There is deliberately little between this and the small view. Everything a
 * generator can be told is in its settings now, so what is left to draw is the
 * one number it produces — and a node that showed something quite different when
 * opened would be claiming to have more to say than it does.
 */
@Component({
  standalone: true,
  selector: 'fb-random-numbers-normal',
  template: `
    <p class="reading">{{currentValue}}</p>
    <p class="units">every {{worker?.interval}} ms</p>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 2px;
      justify-content: center;
      padding: 10px 16px;
      width: 150px;
    }

    .reading {
      font-size: 30px;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .units {
      font-size: 11px;
      margin: 0;
      opacity: 0.6;
    }
  `]
})
export class RandomNumbersNormalComponent extends RandomNumbersView {
}
