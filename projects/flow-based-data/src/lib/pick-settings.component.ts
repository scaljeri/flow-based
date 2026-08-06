import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { PickConfig, PickShape, PickWorker } from './pick.worker';

/** Which shape to build, and which field is which. */
@Component({
  standalone: true,
  selector: 'fb-pick-settings',
  template: `
    <label class="field">
      <span class="label">Build</span>
      <select [value]="shape" (change)="write('shape', $event)">
        <option value="geo">Places (lat, lon, label)</option>
        <option value="point">Points (x, y)</option>
        <option value="grid">A grid (a raster over an area)</option>
        <option value="value">One value</option>
      </select>
    </label>

    @for (field of fields; track field.key) {
      <label class="field">
        <span class="label">{{field.label}}</span>
        <input type="text" autocomplete="off" spellcheck="false"
               [value]="read(field.key)" [placeholder]="field.hint"
               (change)="write(field.key, $event)">
      </label>
    }

    <p class="state" [class.error]="!!worker?.error">
      {{worker?.error ?? (worker?.count ?? 0) + ' out'}}
    </p>
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

    .state {
      margin: 0;
      opacity: 0.75;
    }

    .state.error {
      color: #ff8aa8;
      opacity: 1;
    }
  `]
})
export class PickSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): PickWorker | undefined {
    return this.service.worker as PickWorker | undefined;
  }

  get shape(): PickShape {
    return this.worker?.shape ?? 'geo';
  }

  /** The fields a shape actually uses; the others would be furniture. */
  get fields(): { key: keyof PickConfig; label: string; hint: string }[] {
    if (this.shape === 'value') {
      return [{ key: 'a', label: 'Path', hint: 'count' }];
    }

    /*
     * A raster names its parts once, not per item — and the defaults are what
     * published data tends to call them, so most files need nothing typed.
     */
    if (this.shape === 'grid') {
      return [
        { key: 'values', label: 'Values array', hint: 'values' },
        { key: 'lat', label: 'Latitude bounds', hint: 'lat' },
        { key: 'lon', label: 'Longitude bounds', hint: 'lon' },
        { key: 'dims', label: 'Shape [rows, cols]', hint: 'shape' },
      ];
    }

    const coordinates: { key: keyof PickConfig; label: string; hint: string }[] =
      this.shape === 'geo'
        ? [
          { key: 'a', label: 'Latitude field', hint: 'lat' },
          { key: 'b', label: 'Longitude field', hint: 'lon' },
          { key: 'label', label: 'Label field — empty draws none', hint: 'name' },
          { key: 'ref', label: 'Reference field', hint: 'code' },
        ]
        : [
          { key: 'a', label: 'X field', hint: 'x' },
          { key: 'b', label: 'Y field', hint: 'y' },
        ];

    return [
      { key: 'list', label: 'Path to the list', hint: 'list' },
      ...coordinates,
      { key: 'limit', label: 'At most', hint: '500' },
    ];
  }

  read(key: keyof PickConfig): string {
    const value = this.worker?.read(key) ?? (this.service.state.config as PickConfig)?.[key];

    return value === undefined ? '' : String(value);
  }

  write(key: keyof PickConfig, event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;

    this.worker?.set(key, key === 'limit' ? Number(raw) || 500 : raw);
    this.cdr.detectChanges();
  }
}
