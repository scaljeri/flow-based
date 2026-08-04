import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { DerivativeConfig, DerivativeWorker } from './derivative.worker';

/**
 * The derivative's own words: which variable, and how a plot introduces the
 * result. Left empty, the honest defaults stand — d/dx, and the f'(x)-forms.
 */
@Component({
  standalone: true,
  selector: 'fb-math-derivative-settings',
  template: `
    <label class="text-field">
      <span>Differentiate to</span>
      <input type="text" [value]="worker?.variable ?? 'x'" placeholder="x"
             (change)="onVariable($event)">
    </label>

    <label class="text-field">
      <span>Plot title</span>
      <input type="text" [value]="labels.title ?? ''" placeholder="f'(x) = …"
             (change)="onLabel('title', $event)">
    </label>

    <label class="text-field">
      <span>X-axis label</span>
      <input type="text" [value]="labels.x ?? ''" placeholder="x"
             (change)="onLabel('x', $event)">
    </label>

    <label class="text-field">
      <span>Y-axis label</span>
      <input type="text" [value]="labels.y ?? ''" placeholder="f'(x)"
             (change)="onLabel('y', $event)">
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

    .text-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .text-field span {
      opacity: 0.8;
    }

    .text-field input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      padding: 6px 8px;
    }
  `]
})
export class DerivativeSettingsComponent implements OnInit {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: DerivativeWorker;

  ngOnInit(): void {
    this.worker = this.service.worker as DerivativeWorker | undefined;
  }

  get labels(): DerivativeConfig['labels'] & object {
    const config = (this.service.state.config ?? {}) as DerivativeConfig;

    return config.labels ?? {};
  }

  onVariable(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (this.worker) {
      this.worker.setVariable(value);
    } else {
      const config = (this.service.state.config ??= {}) as DerivativeConfig;

      config.variable = value.trim() || 'x';
    }

    this.cdr.detectChanges();
  }

  onLabel(part: 'title' | 'x' | 'y', event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (this.worker) {
      this.worker.setLabel(part, value);
    } else {
      const config = (this.service.state.config ??= {}) as DerivativeConfig;

      config.labels = { ...(config.labels ?? {}), [part]: value };
    }

    this.cdr.detectChanges();
  }
}
