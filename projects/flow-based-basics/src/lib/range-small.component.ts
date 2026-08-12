import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { RangeWorker } from './range.worker';

/** The mapping as a sentence: what came in, what left. */
@Component({
  standalone: true,
  selector: 'fb-math-range-small',
  template: `
    <span class="intervals">{{intervals}}</span>
    <span class="reading">{{reading}}</span>
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
      padding: 6px 8px;
      width: 110px;
    }

    .intervals {
      opacity: 0.7;
    }

    .reading {
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class RangeSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: RangeWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as RangeWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get intervals(): string {
    const w = this.worker;

    return w ? `${w.fromA}…${w.fromB} → ${w.toA}…${w.toB}` : '';
  }

  get reading(): string {
    const latest = this.worker?.latest;

    if (!latest) {
      return '—';
    }

    const out = latest.out;

    return Number.isInteger(out) ? String(out) : out.toFixed(3);
  }
}
