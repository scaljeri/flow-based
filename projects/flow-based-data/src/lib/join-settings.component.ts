import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { JoinConfig, JoinWorker } from './join.worker';

/** Which field is the key on each side, and what happens to the unmatched. */
@Component({
  standalone: true,
  selector: 'fb-join-settings',
  template: `
    <label class="field">
      <span class="label">Key in a</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('pathA')" placeholder="code"
             (change)="write('pathA', $event)">
    </label>

    <label class="field">
      <span class="label">Key in b</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('pathB')" placeholder="station"
             (change)="write('pathB', $event)">
    </label>

    <label class="field">
      <span class="label">Unmatched items of a</span>
      <select [value]="worker?.how" (change)="write('how', $event)">
        <option value="inner">are dropped (inner)</option>
        <option value="left">pass through unjoined (left)</option>
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
export class JoinSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): JoinWorker | undefined {
    return this.service.worker as JoinWorker | undefined;
  }

  read(key: keyof JoinConfig): string {
    return this.worker?.read(key) ?? '';
  }

  write(key: keyof JoinConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement | HTMLSelectElement).value);
    this.cdr.detectChanges();
  }
}
