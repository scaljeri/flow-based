import { Component } from '@angular/core';
import { MandelbrotView } from './mandelbrot-view';

/** Opened in place: big enough to press a point in, and to see what you hit. */
@Component({
  standalone: true,
  selector: 'fb-mandelbrot-normal',
  template: `
    <canvas #plot [class]="dragIgnore" (pointerdown)="onPress($event)"></canvas>
    <p class="hint">Press a point to follow its orbit</p>
  `,
  styles: [`
    :host {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      line-height: 0;
      padding: 6px;
      width: 300px;
    }

    canvas {
      background: #000;
      border-radius: 8px;
      cursor: crosshair;
      flex: 1 1 288px;
      min-height: 288px;
      touch-action: none;
      width: 100%;
    }

    :host-context([sized]) canvas {
      min-height: 0;
    }

    .hint {
      color: rgba(255, 255, 255, 0.55);
      flex: 0 0 auto;
      font: 11px system-ui, sans-serif;
      line-height: normal;
      margin: 4px 0 0;
      text-align: center;
    }
  `]
})
export class MandelbrotNormalComponent extends MandelbrotView {
  protected override readonly interactive = true;
}
