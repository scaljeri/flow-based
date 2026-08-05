import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { RequestWorker } from './request.worker';

/** At rest: the method, and whether the last attempt worked. */
@Component({
  standalone: true,
  selector: 'fb-request-small',
  template: `
    <span class="glyph">{{worker?.method ?? 'GET'}} ⇩</span>
    <span class="value" [class.error]="!!worker?.error">{{value}}</span>
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
      width: 132px;
    }

    .glyph {
      letter-spacing: 0.08em;
      opacity: 0.7;
    }

    .value {
      min-height: 1.2em;
      text-align: center;
    }

    /* A failure is the node's whole news; a zero would look like an answer. */
    .value.error {
      color: #ff8aa8;
      font-size: 10px;
    }
  `]
})
export class RequestSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: RequestWorker;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as RequestWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get value(): string {
    if (!this.worker) {
      return '';
    }

    if (this.worker.error) {
      return this.worker.error;
    }

    return this.worker.received ? `${this.worker.received} × ${this.worker.status}` : '…';
  }
}
