import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { RangeConfig, RangeWorker } from './range.worker';

/** The two intervals, and whether the answer may leave the second. */
@Component({
  standalone: true,
  selector: 'fb-math-range-settings',
  template: `
    @for (field of FIELDS; track field.key) {
      <label class="field">
        <span class="label">{{field.label}}</span>
        <input type="number" [value]="worker?.read(field.key)"
               (change)="onNumber(field.key, $event)">
      </label>
    }

    <label class="switch">
      <span>Clamp to the target</span>
      <input type="checkbox" [checked]="worker?.clamp"
             (change)="onClamp($event)">
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

    .label {
      opacity: 0.8;
    }

    input[type='number'] {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    .switch {
      align-items: center;
      display: flex;
      gap: 8px;
    }
  `]
})
export class RangeSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly FIELDS: { key: keyof RangeConfig; label: string }[] = [
    { key: 'fromA', label: 'From — start' },
    { key: 'fromB', label: 'From — end' },
    { key: 'toA', label: 'To — start' },
    { key: 'toB', label: 'To — end' },
  ];

  get worker(): RangeWorker | undefined {
    return this.service.worker as RangeWorker | undefined;
  }

  onNumber(key: keyof RangeConfig, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (!Number.isNaN(value)) {
      this.worker?.write(key, value);
      this.cdr.detectChanges();
    }
  }

  onClamp(event: Event): void {
    this.worker?.write('clamp', (event.target as HTMLInputElement).checked);
    this.cdr.detectChanges();
  }
}
