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
      <span class="of">kept {{worker?.kept ?? 0}} of {{worker?.total ?? 0}}</span>

      <!--
        And WHICH ones. "4 of 5" says a rule ran; it does not say what the rule
        decided, and the two mistakes a filter makes — keeping everything, and
        keeping the wrong four — look identical from a count.
      -->
      @if (labels.length) {
        <span class="kept" [title]="labels.join(', ')">{{labels.join(', ')}}</span>
      }
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
      width: 140px;
    }

    .of {
      letter-spacing: 0.04em;
      opacity: 0.6;
    }

    .kept {
      line-height: 1.35;
      max-width: 100%;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
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

  /** At most a handful; a filter that kept forty says so by its count. */
  get labels(): string[] {
    const kept = this.worker?.labels ?? [];

    return kept.length > 6 ? [...kept.slice(0, 6), '…'] : kept;
  }
}
