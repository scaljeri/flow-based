import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { GeoSourceConfig, GeoSourceWorker } from './geo-source.worker';

/**
 * Where the list is, and which field is which.
 *
 * Paths rather than an expression: naming a field is configuration, writing
 * code to find it is not, and only data is allowed to travel these wires.
 */
@Component({
  standalone: true,
  selector: 'fb-geo-source-settings',
  template: `
    @for (field of fields; track field.key) {
      <label class="field">
        <span class="label">{{field.label}}</span>
        <input type="text" autocomplete="off" spellcheck="false"
               [value]="read(field.key)" [placeholder]="field.hint"
               (change)="write(field.key, $event)">
      </label>
    }

    <p class="state" [class.error]="!!worker?.error">
      {{worker?.error ?? (worker?.count ?? 0) + ' places'}}
    </p>

    <button type="button" class="reload" (click)="reload()">Fetch again</button>
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

    .state {
      margin: 0;
      opacity: 0.75;
    }

    .state.error {
      color: #ff8aa8;
      opacity: 1;
    }

    .reload {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      min-height: 32px;
    }
  `]
})
export class GeoSourceSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly fields: { key: keyof GeoSourceConfig; label: string; hint: string }[] = [
    { key: 'url', label: 'URL', hint: '../tno-topas/lml.json' },
    { key: 'list', label: 'Path to the list', hint: 'list' },
    { key: 'lat', label: 'Latitude field', hint: 'lat' },
    { key: 'lon', label: 'Longitude field', hint: 'lon' },
    { key: 'label', label: 'Label field', hint: 'name' },
    { key: 'limit', label: 'At most', hint: '200' },
  ];

  get worker(): GeoSourceWorker | undefined {
    return this.service.worker as GeoSourceWorker | undefined;
  }

  read(key: keyof GeoSourceConfig): string {
    const value = this.worker?.read(key) ?? (this.service.state.config as GeoSourceConfig)?.[key];

    return value === undefined ? '' : String(value);
  }

  write(key: keyof GeoSourceConfig, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;

    this.worker?.set(key, key === 'limit' ? Number(raw) || 200 : raw);
    this.cdr.detectChanges();
  }

  reload(): void {
    void this.worker?.load();
    this.cdr.detectChanges();
  }
}
