import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { FilterConfig, FilterWorker } from './filter.worker';

/**
 * The rule, stated rather than its answer.
 *
 * Four tests and no expression language, on the same reasoning as the
 * Template's modifiers: a node that evaluates code stops being a node you can
 * read off a canvas.
 */
@Component({
  standalone: true,
  selector: 'fb-filter-settings',
  template: `
    <label class="field">
      <span>List — a path to the array, empty if it IS the array</span>
      <input type="text" [value]="read('list')" (change)="write('list', $event)"
             placeholder="regions.0.pollutants">
    </label>

    <label class="field">
      <span>Judge — a path within one item, empty for the item itself</span>
      <input type="text" [value]="read('path')" (change)="write('path', $event)" placeholder="id">
    </label>

    <label class="field">
      <span>Test</span>
      <select [value]="read('test') || 'oneOf'" (change)="write('test', $event)">
        <option value="oneOf">is one of — a comma-separated list</option>
        <option value="is">is exactly</option>
        <option value="has">contains</option>
        <option value="matches">matches a pattern</option>
      </select>
    </label>

    <label class="field">
      <span>Against</span>
      <input type="text" [value]="read('value')" (change)="write('value', $event)"
             placeholder="PM2.5, PM10, NO2, O3">
    </label>

    <label class="check">
      <input type="checkbox" [checked]="negate" (change)="onNegate($event)">
      <span>Keep what does NOT match</span>
    </label>

    <p class="state">{{worker?.kept ?? 0}} of {{worker?.total ?? 0}} kept</p>
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

    .check {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    input[type=text], select {
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
export class FilterSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): FilterWorker | undefined {
    return this.service.worker as FilterWorker | undefined;
  }

  get negate(): boolean {
    return this.read('negate') === 'true';
  }

  read(key: keyof FilterConfig): string {
    return this.worker?.read(key) ?? '';
  }

  write(key: keyof FilterConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement | HTMLSelectElement).value);
    this.cdr.detectChanges();
  }

  onNegate(event: Event): void {
    this.worker?.write('negate', (event.target as HTMLInputElement).checked);
    this.cdr.detectChanges();
  }
}
