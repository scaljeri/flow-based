import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TapWorker } from '../../workers/tap';

/**
 * What the logger's three drawings have in common: the worker, and the reading.
 *
 * A base class rather than one component branching on the view. Each size of this
 * node is its own component now — see FB_CONFIG — so the shell mounts one of them
 * and nothing else exists. What used to be `.minified` and `.expanded` sections
 * of a single template, both always in the DOM and one of them hidden by CSS, is
 * three files that each draw one thing and size themselves to it.
 *
 * Abstract and undeclared: it has no selector, so it is never mounted itself.
 */
@Directive()
export abstract class TapView implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: TapWorker;
  /** The last value seen, or an em dash before anything has arrived. */
  value: number | string = '—';

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as TapWorker | undefined;
    this.read();

    this.subscription = this.worker?.getStream().subscribe(() => {
      this.read();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /*
   * Read from the worker rather than from the value the stream emitted: a
   * drawing mounted halfway through a run has missed every emission so far, and
   * the worker is what remembers them.
   */
  private read(): void {
    const current = this.worker?.currentValue;

    this.value = typeof current === 'number' ? current : (current ?? '—');
  }

  get history(): number[] {
    return this.worker?.history ?? [];
  }

  get count(): number {
    return this.worker?.count ?? 0;
  }
}
