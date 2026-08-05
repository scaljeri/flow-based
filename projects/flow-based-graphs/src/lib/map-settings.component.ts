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

  onFollow(event: Event): void {
    this.worker?.setFollow((event.target as HTMLInputElement).checked);
    this.cdr.detectChanges();
  }
}
