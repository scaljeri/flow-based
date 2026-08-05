import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { PointsWorker } from './points.worker';

/** At rest: the point the walk is on, by name where it has one. */
@Component({
  standalone: true,
  selector: 'fb-math-points-small',
  template: `
    <span class="glyph">●●●●</span>
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
      width: 104px;
    }

    .glyph {
      letter-spacing: 0.25em;
      opacity: 0.7;
    }

    .value {
      font-size: 15px;
      font-variant-numeric: tabular-nums;
      min-height: 1.2em;
    }
  `]
})
export class PointsSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker!: PointsWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as PointsWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get value(): string {
    const point = this.worker?.current;

    if (!point) {
      return '';
    }

    // The label is what the author called this position; the coordinates are
    // the fallback for a set nobody bothered to name.
    return point.label || `${point.re}, ${point.im}i`;
  }
}
