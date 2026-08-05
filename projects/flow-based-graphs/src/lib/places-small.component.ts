import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { PlacesWorker } from './places.worker';

/** At rest: how many places, and the one it is on if it is walking them. */
@Component({
  standalone: true,
  selector: 'fb-places-small',
  template: `
    <span class="glyph">◉</span>
    <span class="value">{{value}}</span>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 2px;
      justify-content: center;
      padding: 6px 10px;
      width: 108px;
    }

    .glyph {
      opacity: 0.7;
    }

    .value {
      font-size: 13px;
      min-height: 1.2em;
      text-align: center;
    }
  `]
})
export class PlacesSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker!: PlacesWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as PlacesWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get value(): string {
    if (!this.worker) {
      return '';
    }

    // Standing still, the count is the fact; walking, the place is.
    return this.worker.interval > 0
      ? this.worker.current?.label || `${this.worker.current?.lat}, ${this.worker.current?.lon}`
      : `${this.worker.places.length} places`;
  }
}
