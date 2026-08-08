import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { FieldPlotWorker } from './field.worker';

/**
 * How the values are spread over the colours.
 *
 * One question, because it is the only one this node has: everything else —
 * where the rectangle is, how finely it was worked out — travels with the
 * field, decided by whoever computed it.
 */
@Component({
  standalone: true,
  selector: 'fb-field-settings',
  template: `
    <label class="field">
      <span>Spread the colours</span>
      <select [value]="scale" (change)="onScale($event)">
        <option value="linear">Evenly — for a quantity</option>
        <option value="log">By orders — when most values are small</option>
      </select>
    </label>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 8px;
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
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    option {
      color: #000;
    }
  `]
})
export class FieldSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private get worker(): FieldPlotWorker | undefined {
    return this.service.worker as FieldPlotWorker | undefined;
  }

  get scale(): string {
    return this.worker?.scale ?? 'linear';
  }

  onScale(event: Event): void {
    this.worker?.set('scale', (event.target as HTMLSelectElement).value as 'linear' | 'log');
    this.cdr.detectChanges();
  }
}
