import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { IterateWorker } from './iterate.worker';

/**
 * At rest: the one thing this node decides.
 *
 * Not the current value — that is what the plane beside it draws, and a number
 * changing four times a second is unreadable anyway. What a reader wants from
 * the box is the verdict: did this `c` stay, or did it leave, and how soon.
 */
@Component({
  standalone: true,
  selector: 'fb-math-iterate-small',
  template: `
    <span class="rule">z² + c</span>
    <span class="c">c = {{c}}</span>
    <span class="verdict" [class.gone]="escaped !== null">{{verdict}}</span>
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
      width: 132px;
    }

    .rule {
      font-size: 14px;
      opacity: 0.75;
    }

    .c {
      font-variant-numeric: tabular-nums;
      opacity: 0.6;
    }

    .verdict {
      color: #9ee8a0;
      font-size: 11px;
    }

    .verdict.gone {
      color: #ff8aa8;
    }
  `]
})
export class IterateSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private worker?: IterateWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as IterateWorker | undefined;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get c(): string {
    const { re, im } = this.worker?.c ?? { re: 0, im: 0 };

    return `${round(re)} ${im < 0 ? '−' : '+'} ${round(Math.abs(im))}i`;
  }

  get escaped(): number | null {
    return this.worker?.escapedAt ?? null;
  }

  get verdict(): string {
    const escaped = this.escaped;

    return escaped === null
      ? `stays, ${this.worker?.steps ?? 0} steps in`
      : `escapes after ${escaped}`;
  }
}

function round(value: number): string {
  return (Math.round(value * 1000) / 1000).toString();
}
