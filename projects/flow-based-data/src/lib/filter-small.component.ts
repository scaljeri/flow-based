import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { FilterWorker } from './filter.worker';

/**
 * At rest: how much of the list survived.
 *
 * "4 of 5" is the whole news. A filter that quietly kept everything and one
 * that quietly kept nothing look identical from the outside, and both are
 * usually a rule that does not say what its author meant.
 */
@Component({
  standalone: true,
  selector: 'fb-filter-small',
  template: `
    @if (worker?.error) {
      <span class="error">{{worker?.error}}</span>
    } @else {
      <span class="count">{{worker?.kept ?? 0}}</span>
      <span class="of">of {{worker?.total ?? 0}}</span>
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
      width: 96px;
    }

    .count {
      font-size: 20px;
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
    }

    .of {
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
export class FilterSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: FilterWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as FilterWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
