import { Component } from '@angular/core';
import { ComplexPlaneView } from './complex-plane-view';

/** Opened in place: the plane with its zero cross, at panel size. */
@Component({
  standalone: true,
  selector: 'fb-complex-plane-normal',
  template: `
    @if (title) {
      <p class="plot-title">{{title}}</p>
    }
    <canvas #plot></canvas>
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

    .plot-title {
      color: rgba(255, 255, 255, 0.9);
      flex: 0 0 auto;
      font: 12px system-ui, sans-serif;
      line-height: normal;
      margin: 0 0 4px;
      text-align: center;
    }

    canvas {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      flex: 1 1 288px;
      min-height: 288px;
      width: 100%;
    }

    :host-context([sized]) canvas {
      min-height: 0;
    }
  `]
})
export class ComplexPlaneNormalComponent extends ComplexPlaneView {
  protected override readonly axes = true;
}
