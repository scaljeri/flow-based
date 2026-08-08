import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { MandelbrotWorker } from './mandelbrot.worker';

/**
 * At rest: what it is working on, and how far it has got.
 *
 * Not a picture — this node no longer has one. It produces a field and
 * something else draws it, so what it can honestly show is the question it is
 * answering and its progress through it.
 */
@Component({
  standalone: true,
  selector: 'fb-mandelbrot-small',
  template: `
    <span class="rule">z² + c</span>
    <span class="where">{{where}}</span>
    <span class="state">{{state}}</span>
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
      padding: 8px 10px;
      width: 140px;
    }

    .rule {
      font-size: 14px;
      opacity: 0.75;
    }

    .where {
      font-variant-numeric: tabular-nums;
      opacity: 0.6;
    }

    .state {
      font-size: 11px;
      opacity: 0.5;
    }
  `]
})
export class MandelbrotSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker?: MandelbrotWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as MandelbrotWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get where(): string {
    const view = this.worker?.view;

    return view ? `${round(view.re)} ${view.im < 0 ? '−' : '+'} ${round(Math.abs(view.im))}i` : '';
  }

  get state(): string {
    const done = this.worker?.progress ?? 0;
    const size = this.worker?.resolution ?? 0;

    return done < 1 ? `${Math.round(done * 100)}%` : `${size}×${size} cells`;
  }
}

function round(value: number): string {
  return (Math.round(value * 1000) / 1000).toString();
}
