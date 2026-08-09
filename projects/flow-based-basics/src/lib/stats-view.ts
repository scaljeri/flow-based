import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { StatsDistribution, StatsWorker } from './stats.worker';

/**
 * What every stats drawing shares: the worker and its readings.
 *
 * Each view subclasses this and draws what fits its size; the numbers and the
 * subscription are the same three lines in all of them, so they live here once.
 */
@Directive()
export abstract class StatsView implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  worker!: StatsWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as StatsWorker;

    this.subscription = this.worker.updated$.subscribe(data => {
      this.onData(data);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected onData(_data: StatsDistribution): void {
    // A hook: a view that draws more than the numbers overrides this.
  }

  get min(): string {
    return this.worker.min === null ? '—' : this.worker.min.toFixed(4);
  }

  get max(): string {
    return this.worker.max === null ? '—' : this.worker.max.toFixed(4);
  }

  get avg(): string {
    return this.worker.avg.toFixed(4);
  }

  onReset(): void {
    this.worker.reset();
  }
}
