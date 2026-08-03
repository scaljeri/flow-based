import { ChangeDetectorRef, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { RandomNumbersWorker } from '../../workers/random-numbers';

/**
 * What the generator's drawings have in common: the number it just produced.
 *
 * That is all either of them shows. The range, the interval and the
 * integers-only switch moved into the settings panel, where every other node's
 * configuration already lives — a generator at rest is a reading, not a form,
 * and putting the form beside the reading meant the node was 500px wide before
 * it had said anything.
 */
@Directive()
export abstract class RandomNumbersView implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: RandomNumbersWorker;
  /** Genuinely absent until the first value arrives, so it must stay blank. */
  currentValue?: number;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as RandomNumbersWorker | undefined;

    this.subscription = this.worker?.getStream().subscribe(value => {
      this.currentValue = this.worker!.integer ? value : parseFloat(value.toFixed(4));
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
