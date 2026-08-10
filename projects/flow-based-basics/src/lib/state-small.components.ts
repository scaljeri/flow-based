import { ChangeDetectorRef, Component, Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { FbNoDragDirective, NodeService } from '@scaljeri/flow-based';
import { Observable, Subscription } from 'rxjs';
import { AccumulatorWorker, DelayWorker, HoldWorker } from './state.workers';

/** Shared plumbing, same shape as the moment views. */
@Directive()
abstract class StateView<TWorker extends { changes: Observable<void> }> implements OnInit, OnDestroy {
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

  /** One line for a reading that can be anything. */
  label(value: unknown): string {
    if (value === undefined || value === null) {
      return '—';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
      return String(value);
    }

    return Array.isArray(value) ? `array (${value.length})` : 'object';
  }
}

const STATE_STYLES = `
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
  }

  .faint {
    opacity: 0.55;
  }
`;

/** The frozen value, the flowing one faintly beside it, and the freeze. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-hold-small',
  template: `
    <button type="button" fbNoDrag (click)="worker?.latch()">hold</button>
    <span class="reading">{{label(worker?.held)}}</span>
    <span class="reading faint">{{label(worker?.current)}}</span>
  `,
  styles: [STATE_STYLES],
})
export class HoldSmallComponent extends StateView<HoldWorker> {
}

/** The running total, and its reset. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-accumulator-small',
  template: `
    <span class="reading">{{label(worker?.total)}}</span>
    <button type="button" fbNoDrag (click)="worker?.reset()">reset</button>
  `,
  styles: [STATE_STYLES],
})
export class AccumulatorSmallComponent extends StateView<AccumulatorWorker> {
}

/** What will leave on the next step, behind what arrived since. */
@Component({
  standalone: true,
  selector: 'fb-delay-small',
  template: `
    <span class="reading">{{label(worker?.stored)}}</span>
    <span class="reading faint">← {{label(worker?.current)}}</span>
  `,
  styles: [STATE_STYLES],
})
export class DelaySmallComponent extends StateView<DelayWorker> {
}
