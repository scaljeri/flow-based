import { Component } from '@angular/core';
import { FieldView } from './field-view';

/** At rest: the picture, small. A field is recognisable long before it is legible. */
@Component({
  standalone: true,
  selector: 'fb-field-small',
  template: `<canvas #plot></canvas>`,
  styles: [`
    :host {
      box-sizing: border-box;
      display: block;
      line-height: 0;
      padding: 6px;
    }

    canvas {
      background: #000;
      border-radius: 6px;
      height: 96px;
      width: 96px;
    }
  `]
})
export class FieldSmallComponent extends FieldView {
}
