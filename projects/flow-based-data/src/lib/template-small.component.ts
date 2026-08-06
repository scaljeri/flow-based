import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { TemplateWorker } from './template.worker';

/**
 * At rest: what it built, or what it is still waiting for.
 *
 * The waiting is the news. A template that emits nothing looks identical to a
 * template that is broken, and the difference is one word — so the node names
 * the placeholders nothing has filled yet, which is also the list of sockets
 * that need connecting.
 */
@Component({
  standalone: true,
  selector: 'fb-template-small',
  template: `
    @if (missing.length) {
      <span class="label">waiting for</span>
      <span class="missing">{{missing.join(', ')}}</span>
    } @else if (result) {
      <span class="label">built</span>
      <span class="result" [title]="result">{{tail}}</span>
    } @else {
      <span class="label">no pattern</span>
    }
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
      padding: 10px 12px;
      width: 160px;
    }

    .label {
      letter-spacing: 0.08em;
      opacity: 0.7;
      text-transform: uppercase;
    }

    .missing {
      color: #ffcf70;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    /*
     * The END of the string, not the start: every URL from one publisher opens
     * with the same forty characters, and the part that differs — the date,
     * the pollutant — is the part at the far end.
     */
    .result {
      direction: rtl;
      font: 11px/1.3 ui-monospace, monospace;
      max-width: 100%;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class TemplateSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: TemplateWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as TemplateWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get missing(): string[] {
    return this.worker?.missing ?? [];
  }

  get result(): string {
    return this.worker?.result ?? '';
  }

  /** The last stretch of it, which is the part that is actually different. */
  get tail(): string {
    const result = this.result;

    return result.length > 34 ? result.slice(-34) : result;
  }
}
