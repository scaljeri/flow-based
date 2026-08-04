import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { BasicGraphWorker } from '../../workers/basic-graph';

/** The worker and its stream, shared by every drawing of this node. */
@Directive()
export abstract class BasicGraphView implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  worker!: BasicGraphWorker;
  /** Absent until the first value arrives; the template shows a blank. */
  lastValue?: number;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as BasicGraphWorker;

    this.subscription = this.worker.getStream().subscribe(value => {
      this.lastValue = typeof value === 'number' ? parseFloat(value.toFixed(4)) : value;
      this.onValues(this.worker.values);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected onValues(_values?: number[]): void {
    // A hook: a view that draws the series overrides this.
  }
}
