import { Component } from '@angular/core';
import { ComplexPlaneView } from './complex-plane-view';

/** The whole surface; the plane keeps its square truth in the middle. */
@Component({
  standalone: true,
  selector: 'fb-complex-plane-full',
  template: `
    <div class="wrap">
      @if (title) {
        <p class="plot-title">{{title}}</p>
      }
      <canvas #plot></canvas>
    </div>
  `,
  styles: [`
    :host {
      box-sizing: border-box;
      display: flex;
      height: 100%;
      line-height: 0;
      padding: 10px;
      width: 100%;
    }

    .wrap {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .plot-title {
      color: rgba(255, 255, 255, 0.9);
      font: 13px system-ui, sans-serif;
      line-height: normal;
      margin: 0 0 6px;
      text-align: center;
    }

    canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      flex: 1;
      min-height: 0;
    }
  `]
})
export class ComplexPlaneFullComponent extends ComplexPlaneView {
  protected override readonly axes = true;
}
