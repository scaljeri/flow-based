import { Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { TimeseriesStyle } from './timeseries-view';

/**
 * How the series is drawn. The choice is presentation, so it lives in config —
 * the JSON keeps it, and every view of this node reads the same answer.
 */
@Component({
  standalone: true,
  selector: 'fb-timeseries-settings',
  template: `
    <label class="field">
      <span>Representation</span>
      <select [value]="style" (change)="onStyle($event)">
        @for (option of options; track option.id) {
          <option [value]="option.id">{{option.label}}</option>
        }
      </select>
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
  `]
})
export class TimeseriesSettingsComponent {
  private readonly service = inject(NodeService);

  readonly options: { id: TimeseriesStyle; label: string }[] = [
    { id: 'line', label: 'Line' },
    { id: 'area', label: 'Area' },
    { id: 'bars', label: 'Bars' },
  ];

  get style(): TimeseriesStyle {
    return this.service.state.config?.style ?? 'line';
  }

  onStyle(event: Event): void {
    const style = (event.target as HTMLSelectElement).value as TimeseriesStyle;

    this.service.state.config = { ...(this.service.state.config ?? {}), style };
  }
}
