import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { DerivativeWorker } from './derivative.worker';
import { FnValue } from './function-value';
import { renderTex } from './katex-view';

/** The derivative node shows what it produced; unconnected it shows its job. */
@Component({
  standalone: true,
  selector: 'fb-math-derivative-small',
  template: `<span class="tex">d/dx</span>`,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      font-size: 15px;
      justify-content: center;
      max-width: 220px;
      min-width: 90px;
      overflow: hidden;
      padding: 8px 12px;
    }
  `]
})
export class DerivativeSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  private subscription?: Subscription;

  ngOnInit(): void {
    const worker = this.service.worker as DerivativeWorker;

    this.subscription = worker.getStream().subscribe((value: FnValue) => {
      const target = this.host.nativeElement.querySelector('.tex') as HTMLElement | null;

      if (target) {
        renderTex(target, `f'(x) = ${value.tex}`);
      }

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
