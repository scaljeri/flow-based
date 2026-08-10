import { ChangeDetectorRef, Component, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { FbNoDragDirective, NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { ClockWorker } from './clock.worker';
import { TriggerWorker } from './trigger.worker';
import { GateWorker } from './gate.worker';

/*
 * The three moment nodes' drawings, in one file: each is a reading and one
 * press, and the plumbing — subscribe to the worker, redraw on its changes —
 * is identical.
 */

/** Shared plumbing; abstract and undeclared, like TapView. */
@Directive()
abstract class MomentView<TWorker extends { changes: import('rxjs').Observable<void> }> implements OnInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  worker?: TWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as TWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

const MOMENT_STYLES = `
  :host {
    align-items: center;
    color: #fff;
    display: flex;
    font: 12px system-ui, sans-serif;
    gap: 8px;
    justify-content: center;
    padding: 8px 10px;
  }

  button {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
    font: inherit;
    padding: 4px 10px;
  }

  .reading {
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }
`;

/** A clock at rest: its count, and play/pause. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-clock-small',
  template: `
    <button type="button" fbNoDrag
            [attr.aria-label]="worker?.running ? 'Pause' : 'Run'"
            (click)="worker?.toggle(); cdr.detectChanges()">
      {{worker?.running ? '⏸' : '▶'}}
    </button>
    <span class="reading">{{worker?.count ?? 0}}</span>
  `,
  styles: [MOMENT_STYLES],
})
export class ClockSmallComponent extends MomentView<ClockWorker> {
}

/** A trigger IS its button. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-trigger-small',
  template: `
    <button type="button" fbNoDrag (click)="worker?.fire()">{{worker?.label}}</button>
    <span class="reading">{{worker?.count ?? 0}}</span>
  `,
  styles: [MOMENT_STYLES],
})
export class TriggerSmallComponent extends MomentView<TriggerWorker> {
}

/** A gate says which way it stands, and can be flipped where it stands. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-gate-small',
  template: `
    <button type="button" fbNoDrag
            [attr.aria-label]="worker?.open ? 'Close the gate' : 'Open the gate'"
            (click)="worker?.toggle(); cdr.detectChanges()">
      {{worker?.open ? 'open' : 'closed'}}
    </button>
  `,
  styles: [MOMENT_STYLES],
})
export class GateSmallComponent extends MomentView<GateWorker> {
}
