import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { JoinWorker } from './join.worker';

/**
 * How many of the left side found a partner. That fraction is the join's
 * honesty: 93 of 93 says the keys line up, 3 of 93 says they do not.
 */
@Component({
  standalone: true,
  selector: 'fb-join-small',
  template: `
    <span class="reading" [class.error]="!!worker?.error">
      {{worker?.error ?? (worker?.matched ?? 0) + ' of ' + (worker?.total ?? 0) + ' matched'}}
    </span>
  `,
  styles: [`
    :host {
      color: #fff;
      display: block;
      font: 12px system-ui, sans-serif;
      padding: 8px 12px;
    }

    .reading {
      font-variant-numeric: tabular-nums;
      opacity: 0.85;
    }

    .error {
      color: #ff8aa8;
      opacity: 1;
    }
  `]
})
export class JoinSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: JoinWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as JoinWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
