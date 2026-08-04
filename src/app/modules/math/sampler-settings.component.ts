import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { SamplerConfig, SamplerWorker } from './sampler.worker';

type SamplerKey = 'from' | 'to' | 'step' | 'interval';

/**
 * The sweep: which x's, how fine, how fast.
 *
 * Every field is a STEPPER — minus, value, plus — rather than a bare
 * type=number input. A phone's numeric keyboard has no minus key, so "from
 * -5" was simply untypeable on the device this app is built for; the − button
 * makes every value reachable by tapping, and the field still takes typed
 * input for anyone with a keyboard.
 *
 * Every change restarts the sweep from the left — the settings ARE the sweep,
 * and applying half of them to a run already in progress produces a curve
 * nobody asked for.
 */
@Component({
  standalone: true,
  selector: 'fb-math-sampler-settings',
  template: `
    @for (field of fields; track field.key) {
      <div class="field">
        <span class="label">{{field.label}}</span>

        <div class="stepper">
          <button type="button" [attr.aria-label]="'Decrease ' + field.label"
                  (click)="nudge(field, -1)">−</button>
          <input type="text" inputmode="decimal" autocomplete="off"
                 [value]="read(field.key)"
                 (change)="typed(field, $event)">
          <button type="button" [attr.aria-label]="'Increase ' + field.label"
                  (click)="nudge(field, 1)">+</button>
        </div>
      </div>
    }
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

    .label {
      opacity: 0.8;
    }

    .stepper {
      display: flex;
      gap: 6px;
    }

    .stepper button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      flex: 0 0 38px;
      font-size: 16px;
      min-height: 34px;
    }

    .stepper input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      text-align: center;
    }
  `]
})
export class SamplerSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Per-field tap size and floor; interval cannot go below a frame. */
  readonly fields: { key: SamplerKey; label: string; by: number; min?: number }[] = [
    { key: 'from', label: 'From x', by: 1 },
    { key: 'to', label: 'To x', by: 1 },
    { key: 'step', label: 'Step', by: 0.05, min: 0.001 },
    { key: 'interval', label: 'Interval (ms)', by: 10, min: 16 },
  ];

  get worker(): SamplerWorker {
    return this.service.worker as SamplerWorker;
  }

  read(key: SamplerKey): number {
    return this.worker[key];
  }

  nudge(field: { key: SamplerKey; by: number; min?: number }, direction: 1 | -1): void {
    // Rounded to the tap size's precision, or 0.1 + 0.05 shows as 0.15000000000000002.
    const decimals = `${field.by}`.split('.')[1]?.length ?? 0;
    const next = Number((this.read(field.key) + direction * field.by).toFixed(decimals));

    this.write(field, next);
  }

  typed(field: { key: SamplerKey; min?: number }, event: Event): void {
    // Comma tolerated: a Dutch keyboard's decimal key types one.
    const value = Number((event.target as HTMLInputElement).value.replace(',', '.'));

    if (Number.isFinite(value)) {
      this.write(field, value);
    } else {
      // Put the real value back rather than leaving unparseable text standing.
      this.cdr.detectChanges();
    }
  }

  private write(field: { key: SamplerKey; min?: number }, value: number): void {
    const config = (this.service.state.config ??= {}) as SamplerConfig;

    config[field.key] = field.min === undefined ? value : Math.max(field.min, value);
    this.worker.restart();
    this.cdr.detectChanges();
  }
}
