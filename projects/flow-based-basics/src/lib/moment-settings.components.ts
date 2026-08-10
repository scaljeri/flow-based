import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { ClockWorker } from './clock.worker';
import { TriggerConfig, TriggerWorker } from './trigger.worker';

const FIELD_STYLES = `
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

  input {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    box-sizing: border-box;
    color: #fff;
    font: inherit;
    padding: 6px 8px;
    width: 100%;
  }
`;

/** How fast the clock ticks. Running lives on the node itself. */
@Component({
  standalone: true,
  selector: 'fb-clock-settings',
  template: `
    <label class="field">
      <span class="label">Interval (ms, at least 50)</span>
      <input type="number" [value]="worker?.interval ?? 1000"
             (change)="onInterval($event)">
    </label>
  `,
  styles: [FIELD_STYLES],
})
export class ClockSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): ClockWorker | undefined {
    return this.service.worker as ClockWorker | undefined;
  }

  onInterval(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (!Number.isNaN(value)) {
      this.worker?.setConfigValue('interval', value);
      this.cdr.detectChanges();
    }
  }
}

/** What the button says, and which document action fires it. */
@Component({
  standalone: true,
  selector: 'fb-trigger-settings',
  template: `
    <label class="field">
      <span class="label">Button label</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('label')" placeholder="Go"
             (change)="write('label', $event)">
    </label>

    <label class="field">
      <span class="label">Document action — {{'{{'}}!name:…{{'}}'}} with this name fires it</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('action')" placeholder="refresh"
             (change)="write('action', $event)">
    </label>
  `,
  styles: [FIELD_STYLES],
})
export class TriggerSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): TriggerWorker | undefined {
    return this.service.worker as TriggerWorker | undefined;
  }

  read(key: keyof TriggerConfig): string {
    return this.worker?.read(key) ?? '';
  }

  write(key: keyof TriggerConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }
}
