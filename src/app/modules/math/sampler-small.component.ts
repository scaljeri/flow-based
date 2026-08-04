import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { SamplerWorker } from './sampler.worker';

/** At rest: what it does and the sample it just took. */
@Component({
  standalone: true,
  selector: 'fb-math-sampler-small',
  template: `
    <span class="glyph">f(x) → ●●●</span>
    <span class="value">{{value}}</span>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 2px;
      justify-content: center;
      padding: 6px 10px;
      width: 108px;
    }

    .glyph {
      letter-spacing: 0.05em;
      opacity: 0.7;
    }

    .value {
      font-size: 15px;
      font-variant-numeric: tabular-nums;
      min-height: 1.2em;
    }
  `]
})
export class SamplerSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker!: SamplerWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as SamplerWorker;
    this.subscription = this.worker.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get value(): string {
    const value = this.worker?.current;

    return value === undefined ? '' : Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
}
