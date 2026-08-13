import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { NodeService } from './node/node-service';

/**
 * The plumbing every "select-and-reading" node drawing repeats: get the worker
 * from the NodeService, redraw when it announces a change, and drop the
 * subscription on destroy. It was three near-identical copies — a basics
 * WorkerView, a data DataView, a basics ConditionView — so it lives here once, in
 * the package both already depend on.
 *
 * Deliberately ONLY the plumbing. What differs — how a control writes back
 * (straight value, or a numeric-aware read of an event), and what a view reads
 * off its worker — stays in the subclass, because those are where the copies
 * genuinely diverged. Abstract and undeclared: no selector, never mounted itself.
 */
@Directive()
export abstract class FbWorkerView<T extends { changes: Observable<void> } = { changes: Observable<void> }>
implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  worker?: T;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as T | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
