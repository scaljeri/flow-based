import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { FormulaWorker } from './formula.worker';
import { FnValue } from './function-value';
import { renderTex } from './katex-view';

/** A formula at rest IS its notation — typeset, not source. */
@Component({
  standalone: true,
  selector: 'fb-math-formula-small',
  template: `<span class="tex"></span>`,
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
export class FormulaSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  private subscription?: Subscription;

  ngOnInit(): void {
    const worker = this.service.worker as FormulaWorker;

    this.subscription = worker.getStream().subscribe((value: FnValue) => {
      const target = this.host.nativeElement.querySelector('.tex') as HTMLElement | null;

      if (target) {
        renderTex(target, value.tex);
      }

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
