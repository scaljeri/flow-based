import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { PlotWorker } from './plot.worker';
import { PlotMark } from './plot-view';

/**
 * How the series is drawn. The choice is presentation, so it lives in config —
 * the JSON keeps it, and every view of this node reads the same answer.
 */
@Component({
  standalone: true,
  selector: 'fb-plot-settings',
  template: `
    <label class="field">
      <span>Draw each reading as</span>
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
export class PlotSettingsComponent {
  private readonly service = inject(NodeService);

  readonly options: { id: PlotMark; label: string }[] = [
    { id: 'line', label: 'Line' },
    { id: 'dots', label: 'Dots' },
    { id: 'area', label: 'Area' },
    { id: 'bars', label: 'Bars' },
  ];

  private readonly cdr = inject(ChangeDetectorRef);

  private get worker(): PlotWorker | undefined {
    return this.service.worker as PlotWorker | undefined;
  }

  get style(): PlotMark {
    return (this.worker?.mark ?? this.service.state.config?.style ?? 'line') as PlotMark;
  }

  /*
   * Through the worker, which owns the config and tells the views. Written
   * straight onto the state it changed nothing on screen until the next value
   * arrived — and a swept series has no next value.
   */
  onStyle(event: Event): void {
    this.worker?.setMark((event.target as HTMLSelectElement).value);
    this.cdr.detectChanges();
  }
}
