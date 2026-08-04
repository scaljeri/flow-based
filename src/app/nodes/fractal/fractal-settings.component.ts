import { Component, OnInit, inject } from '@angular/core';
import { FbNodeState, NodeService } from '@scaljeri/flow-based';
import { FractalsWorker } from '../../workers/fractals';

/**
 * Which fractal to compute, in the panel where every node's settings live.
 *
 * The select and the reset used to BE the node's whole drawing — a form posing
 * as content. What the node has to say at rest is which fractal it is
 * computing; how to change that is configuration, and this is where
 * configuration goes.
 */
@Component({
  standalone: false,
  selector: 'fb-fractal-settings',
  template: `
    <label class="field">
      <span>Fractal</span>
      <select fbNoDrag [value]="selected" (change)="onFractalChange($event)">
        @for (fractal of fractals; track fractal) {
          <option [value]="fractal.id">{{fractal.name}}</option>
        }
      </select>
    </label>
    
    <button fbNoDrag (click)="onReset()">Reset</button>
    `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 10px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    select {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      padding: 6px;
    }

    select option {
      background: #222;
    }

    button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      padding: 6px 0;
    }
  `]
})
export class FractalSettingsComponent implements OnInit {
  private readonly service = inject(NodeService);

  private state: FbNodeState = this.service.state;
  private worker!: FractalsWorker;

  /*
   * Only fractals that AVAILABLE_FRACTALS actually implements. 'Koch Snowflake'
   * was offered once but has no entry there, so selecting it threw.
   */
  fractals = [
    { name: 'Mandelbrot', id: 'mandelbrot' },
    { name: 'Julia set', id: 'julia' },
  ];

  ngOnInit(): void {
    this.worker = this.service.worker as FractalsWorker;
  }

  get selected(): string {
    return this.state.config.selected;
  }

  onFractalChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;

    this.state.config.selected = id;
    this.worker.setFractal(id);
  }

  onReset(): void {
    this.worker.reset();
  }
}
