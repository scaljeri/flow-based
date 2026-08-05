import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { PickWorker } from './pick.worker';

/**
 * At rest: what it builds, and how much of it came out.
 *
 * The count is the node's real news — a path that names nothing produces zero
 * without failing, and a zero next to the shape it was meant to build is the
 * fastest way to see that.
 */
@Component({
  standalone: true,
  selector: 'fb-pick-small',
  template: `
    <span class="shape">{{worker?.shape ?? 'geo'}}</span>

    @if (worker?.error) {
      <span class="error">{{worker?.error}}</span>
    } @else {
      <span class="count">{{count}}</span>
      <span class="unit">{{unit}}</span>
    }
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 1px;
      justify-content: center;
      padding: 10px 12px;
      width: 138px;
    }

    .shape {
      letter-spacing: 0.08em;
      opacity: 0.7;
      text-transform: uppercase;
    }

    .count {
      font-size: 18px;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
    }

    .unit {
      opacity: 0.6;
    }

    .error {
      color: #ff8aa8;
      font-size: 10px;
      line-height: 1.3;
      text-align: center;
    }
  `]
})
export class PickSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: PickWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as PickWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get count(): string {
    return (this.worker?.count ?? 0).toLocaleString('en');
  }

  /** What the number counts, which differs per shape. */
  get unit(): string {
    switch (this.worker?.shape) {
      case 'grid': return 'cells';
      case 'point': return 'points';
      case 'value': return 'value';
      default: return 'places';
    }
  }
}
