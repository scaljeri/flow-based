import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { ChoiceConfig, ChoiceWorker } from './choice.worker';

/**
 * Where the options are, and which part of each one to use.
 *
 * Three paths and a switch. A list of plain strings needs none of them; a list
 * of objects — `{id, name, path}` is the usual shape — needs to be told which
 * field the reader sees and which one travels on, and those are rarely the
 * same field.
 */
@Component({
  standalone: true,
  selector: 'fb-choice-settings',
  template: `
    <label class="field">
      <span>Options — a path to the array, empty if it IS the array</span>
      <input type="text" [value]="read('list')" (change)="write('list', $event)" placeholder="results.0.options">
    </label>

    <label class="field">
      <span>Shown — a path within one option, empty for the option itself</span>
      <input type="text" [value]="read('label')" (change)="write('label', $event)" placeholder="name">
    </label>

    <label class="field">
      <span>Sent on — same, and rarely the same field</span>
      <input type="text" [value]="read('value')" (change)="write('value', $event)" placeholder="id">
    </label>

    <label class="field">
      <span>As</span>
      <select [value]="read('as') || 'text'" (change)="write('as', $event)">
        <option value="text">Text — for a template's placeholder</option>
        <option value="data">The option itself — for a Pick to take apart</option>
      </select>
    </label>

    <p class="state">{{count}} options, showing “{{chosen}}”</p>
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

    .field span {
      opacity: 0.8;
    }

    input, select {
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

    .state {
      margin: 0;
      opacity: 0.7;
    }
  `]
})
export class ChoiceSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private get worker(): ChoiceWorker | undefined {
    return this.service.worker as ChoiceWorker | undefined;
  }

  get count(): number {
    return this.worker?.count ?? 0;
  }

  get chosen(): string {
    return this.worker?.chosenLabel ?? '';
  }

  read(key: keyof ChoiceConfig): string {
    const value = this.worker?.read(key) ?? (this.service.state.config as ChoiceConfig)?.[key];

    return value === undefined || value === null ? '' : String(value);
  }

  write(key: keyof ChoiceConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement | HTMLSelectElement).value);

    // `as` decides whether this sends text or the item itself, and the worker
    // rewrites its out socket to say so. Wires made before that are re-checked.
    if (key === 'as') {
      this.service.retype();
    }

    this.cdr.detectChanges();
  }
}
