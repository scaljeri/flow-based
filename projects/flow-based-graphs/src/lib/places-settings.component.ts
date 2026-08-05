import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { PlacesConfig, PlacesWorker } from './places.worker';

/**
 * The list itself: where the places are, what they are called, and whether the
 * node walks them.
 *
 * Three fields per row, because a place on this map IS three things — how far
 * north, how far east, and what to call it.
 */
@Component({
  standalone: true,
  selector: 'fb-places-settings',
  template: `
    <div class="field">
      <span class="label">Step every (ms) — 0 stands still</span>

      <div class="stepper">
        <button type="button" aria-label="Slower" (click)="nudgeInterval(-1)">−</button>
        <input type="text" inputmode="numeric" autocomplete="off"
               [value]="interval" (change)="typedInterval($event)">
        <button type="button" aria-label="Faster" (click)="nudgeInterval(1)">+</button>
      </div>
    </div>

    <div class="places">
      <div class="heads">
        <span>lat</span>
        <span>lon</span>
        <span>label</span>
        <span></span>
      </div>

      @for (place of places; track $index) {
        <div class="row">
          <input type="text" inputmode="decimal" autocomplete="off" aria-label="Latitude"
                 [value]="place.lat" (change)="write($index, 'lat', $event)">
          <input type="text" inputmode="decimal" autocomplete="off" aria-label="Longitude"
                 [value]="place.lon" (change)="write($index, 'lon', $event)">
          <input type="text" autocomplete="off" aria-label="Label"
                 [value]="place.label ?? ''" (change)="write($index, 'label', $event)">
          <button type="button" class="remove" aria-label="Remove this place"
                  (click)="remove($index)">×</button>
        </div>
      }
    </div>

    <button type="button" class="add" (click)="add()">Add a place</button>
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
      box-sizing: border-box;
      color: #fff;
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      text-align: center;
    }

    .places {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .heads,
    .row {
      display: grid;
      gap: 4px;
      grid-template-columns: 1fr 1fr 1.2fr 30px;
    }

    .heads {
      opacity: 0.6;
      padding: 0 4px;
    }

    .row input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      min-width: 0;
      padding: 6px 4px;
      text-align: center;
    }

    .remove {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
    }

    .add {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      min-height: 32px;
    }
  `]
})
export class PlacesSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): PlacesWorker | undefined {
    return this.service.worker as PlacesWorker | undefined;
  }

  /*
   * Read through the worker when there is one, straight from config otherwise:
   * a node whose module arrived after the flow briefly has none, and a panel
   * that dereferenced it anyway rendered as nothing at all.
   */
  get places(): { lat: number; lon: number; label?: string }[] {
    return this.worker?.places ?? (this.service.state.config as PlacesConfig)?.places ?? [];
  }

  get interval(): number {
    return this.worker?.interval ?? (this.service.state.config as PlacesConfig)?.interval ?? 0;
  }

  nudgeInterval(direction: 1 | -1): void {
    // Plus makes it faster, so the step is subtracted: the field holds a delay,
    // and a + that slows things down lies.
    const next = this.interval - direction * 200;

    this.worker?.setInterval(next <= 0 ? 0 : Math.max(60, next));
    this.cdr.detectChanges();
  }

  typedInterval(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value.replace(',', '.'));

    if (Number.isFinite(value)) {
      this.worker?.setInterval(value <= 0 ? 0 : Math.max(60, value));
    }

    this.cdr.detectChanges();
  }

  write(index: number, key: 'lat' | 'lon' | 'label', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;

    if (key === 'label') {
      this.worker?.setPlace(index, { label: raw });
    } else {
      const value = Number(raw.replace(',', '.'));

      if (Number.isFinite(value)) {
        this.worker?.setPlace(index, { [key]: value });
      }
    }

    this.cdr.detectChanges();
  }

  add(): void {
    this.worker?.addPlace();
    this.cdr.detectChanges();
  }

  remove(index: number): void {
    this.worker?.removePlace(index);
    this.cdr.detectChanges();
  }
}
