import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { ValueWorker } from './value.worker';

/** What this parameter is called, what kind it is, and its value here. */
@Component({
  standalone: true,
  selector: 'fb-flow-param-settings',
  template: `
    <label class="field">
      <span class="label">Name — the outside knows it as params.&lt;name&gt;</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="worker?.read('name')" placeholder="top"
             (change)="onName($event)">
    </label>

    <label class="field">
      <span class="label">Kind</span>
      <select [value]="worker?.kind" (change)="onKind($event)">
        <option value="number">A number</option>
        <option value="string">Text</option>
      </select>
    </label>

    <label class="field">
      <span class="label">Value, in this instance</span>
      <input [type]="worker?.kind === 'number' ? 'number' : 'text'"
             autocomplete="off" spellcheck="false"
             [value]="worker?.read('value')"
             (change)="onValue($event)">
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

    input,
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

    select option {
      background: #222;
    }
  `]
})
export class FlowParamSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): ValueWorker | undefined {
    return this.service.worker as ValueWorker | undefined;
  }

  onName(event: Event): void {
    this.worker?.write('name', (event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }

  onKind(event: Event): void {
    this.worker?.write('kind', (event.target as HTMLSelectElement).value);
    this.service.retype();
    this.cdr.detectChanges();
  }

  onValue(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;

    this.worker?.set(this.worker.kind === 'number' ? Number(raw) : raw);
    this.cdr.detectChanges();
  }
}
