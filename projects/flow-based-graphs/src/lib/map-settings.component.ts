import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { MapWorker } from './map.worker';

/** What the map does with what it is given, rather than what it is given. */
@Component({
  standalone: true,
  selector: 'fb-map-settings',
  template: `
    <label class="check">
      <input type="checkbox" [checked]="track" (change)="onTrack($event)">
      <span>Join the places in order</span>
    </label>

    <label class="check">
      <input type="checkbox" [checked]="follow" (change)="onFollow($event)">
      <span>Keep everything in view</span>
    </label>

    <!--
      The view is remembered by moving the map, not by filling in a form. All
      that is left to offer is forgetting it again.
    -->
    @if (hasView) {
      <div class="row">
        <span class="state">Opens at {{viewText}}</span>
        <button type="button" (click)="clearView()">Forget</button>
      </div>
    }

    <!--
      Only worth showing when there is a raster to colour: three fields about
      a scale nothing is drawn on is furniture.
    -->
    @if (hasGrid) {
      <h4>Raster</h4>

      <label class="field">
        <span>Opacity</span>
        <input type="text" inputmode="decimal" [value]="opacity" (change)="onNumber('opacity', $event)">
      </label>

      <label class="field">
        <span>Scale from — empty follows the data</span>
        <input type="text" inputmode="decimal" [value]="min" (change)="onNumber('min', $event)">
      </label>

      <label class="field">
        <span>Scale to</span>
        <input type="text" inputmode="decimal" [value]="max" (change)="onNumber('max', $event)">
      </label>
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

    .check {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .row {
      align-items: center;
      display: flex;
      gap: 6px;
    }

    .row .state {
      flex: 1;
    }

    .row button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      min-height: 32px;
      padding: 0 10px;
    }

    .state {
      margin: 0;
      opacity: 0.75;
    }

    h4 {
      font-size: 11px;
      letter-spacing: 0.06em;
      margin: 4px 0 0;
      opacity: 0.6;
      text-transform: uppercase;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field span {
      opacity: 0.8;
    }

    .field input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }
  `]
})
export class MapSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): MapWorker | undefined {
    return this.service.worker as MapWorker | undefined;
  }

  get track(): boolean {
    return this.worker?.track ?? true;
  }

  get follow(): boolean {
    return this.worker?.follow ?? true;
  }

  onTrack(event: Event): void {
    this.worker?.setTrack((event.target as HTMLInputElement).checked);
    this.cdr.detectChanges();
  }

  get hasView(): boolean {
    return !!this.worker?.view;
  }

  get viewText(): string {
    const view = this.worker?.view;

    return view ? `${view.lat}, ${view.lon} · zoom ${view.zoom}` : '';
  }

  clearView(): void {
    this.worker?.clearView();
    this.cdr.detectChanges();
  }

  onFollow(event: Event): void {
    this.worker?.setFollow((event.target as HTMLInputElement).checked);
    this.cdr.detectChanges();
  }

  /** Whether any layer is a raster; the scale is about those only. */
  get hasGrid(): boolean {
    return (this.service.state.sockets ?? [])
      .filter(socket => socket.type === 'in')
      .some(socket => !!this.worker?.layerFor(socket.id!)?.grid);
  }

  get opacity(): string {
    return String(this.worker?.opacity ?? 0.65);
  }

  get min(): string {
    return this.worker?.min === null || this.worker?.min === undefined ? '' : String(this.worker.min);
  }

  get max(): string {
    return this.worker?.max === null || this.worker?.max === undefined ? '' : String(this.worker.max);
  }

  onNumber(key: 'opacity' | 'min' | 'max', event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim().replace(',', '.');
    const value = raw === '' ? null : Number(raw);

    // An empty end of the scale means "follow the data"; unparseable text is
    // not a value at all and leaves what stood.
    if (value === null || Number.isFinite(value)) {
      this.worker?.set(key, key === 'opacity' ? (value ?? 0.65) : value);
    }

    this.cdr.detectChanges();
  }
}
