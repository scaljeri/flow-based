import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { ValueConfig, ValueWorker } from './value.worker';

/** What kind of value, what range a reader may scrub, and what it is called. */
@Component({
  standalone: true,
  selector: 'fb-value-settings',
  template: `
    <label class="field">
      <span class="label">Kind</span>
      <select [value]="worker?.kind" (change)="onKind($event)">
        <option value="number">A number</option>
        <option value="string">Text</option>
      </select>
    </label>

    <label class="field">
      <span class="label">Label on the canvas</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('label')" placeholder="what this knob means"
             (change)="write('label', $event)">
    </label>

    @if (worker?.kind === 'number') {
      @for (field of RANGE; track field.key) {
        <label class="field">
          <span class="label">{{field.label}}</span>
          <input type="number" [value]="read(field.key)"
                 (change)="writeNumber(field.key, $event)">
        </label>
      }
    }
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
export class ValueSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly RANGE: { key: keyof ValueConfig; label: string }[] = [
    { key: 'min', label: 'From' },
    { key: 'max', label: 'To' },
    { key: 'step', label: 'Step' },
  ];

  get worker(): ValueWorker | undefined {
    return this.service.worker as ValueWorker | undefined;
  }

  read(key: keyof ValueConfig): string {
    return this.worker?.read(key) ?? '';
  }

  onKind(event: Event): void {
    this.worker?.write('kind', (event.target as HTMLSelectElement).value);

    // The kind decides what the out socket carries; anything wired to the old
    // type no longer fits, and the shell is told to cut it.
    this.service.retype();
    this.cdr.detectChanges();
  }

  write(key: keyof ValueConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }

  writeNumber(key: keyof ValueConfig, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (!Number.isNaN(value)) {
      this.worker?.write(key, value);
      this.cdr.detectChanges();
    }
  }
}
