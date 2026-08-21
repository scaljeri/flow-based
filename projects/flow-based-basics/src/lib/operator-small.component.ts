import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { OperatorWorker } from './operator.worker';

/** An operator at rest: its sign, and the number it last produced. */
@Component({
  standalone: true,
  selector: 'fb-math-operator-small',
  template: `
    <span class="symbol">{{symbol}}</span>
    <span class="result">{{result}}</span>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 13px system-ui, sans-serif;
      gap: 2px;
      justify-content: center;
      padding: 6px 8px;
      width: 84px;
    }

    .symbol {
      font-size: 20px;
      opacity: 0.7;
    }

    .result {
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class OperatorSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private subscription?: Subscription;
  private worker!: OperatorWorker;

  ngOnInit(): void {
    this.worker = this.service.worker as OperatorWorker;

    // `changes`, not the value stream: the face must also repaint when a
    // removed operand clears the result, which emits no value.
    this.subscription = this.worker.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get symbol(): string {
    return this.service.state.config?.symbol ?? '?';
  }

  get result(): string {
    const value = this.worker?.result;

    // '—' is the house glyph for "not yet" — blank read as broken.
    return value === undefined ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(4);
  }
}
