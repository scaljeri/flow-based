import { Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { SamplerWorker } from './sampler.worker';

/**
 * The sweep: which x's, how fine, how fast.
 *
 * Every change restarts the sweep from the left — the settings ARE the sweep,
 * and applying half of them to a run already in progress produces a curve
 * nobody asked for.
 */
@Component({
  standalone: true,
  selector: 'fb-math-sampler-settings',
  template: `
    <label class="field">
      <span>From x</span>
      <input type="number" [value]="worker.from" (change)="onChange('from', $event)">
    </label>

    <label class="field">
      <span>To x</span>
      <input type="number" [value]="worker.to" (change)="onChange('to', $event)">
    </label>

    <label class="field">
      <span>Step</span>
      <input type="number" step="0.01" min="0.001" [value]="worker.step" (change)="onChange('step', $event)">
    </label>

    <label class="field">
      <span>Interval (ms)</span>
      <input type="number" step="10" min="16" [value]="worker.interval" (change)="onChange('interval', $event)">
    </label>
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

    input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      padding: 6px 8px;
    }
  `]
})
export class SamplerSettingsComponent {
  private readonly service = inject(NodeService);

  get worker(): SamplerWorker {
    return this.service.worker as SamplerWorker;
  }

  onChange(key: 'from' | 'to' | 'step' | 'interval', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (Number.isFinite(value)) {
      const config = (this.service.state.config ??= {});

      config[key] = value;
      this.worker.restart();
    }
  }
}
