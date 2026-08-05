import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { RequestWorker } from './request.worker';

/**
 * At rest: what it asks, whether it worked, and how much came back.
 *
 * A request is the one node whose WAITING is worth drawing. Everything else
 * here answers instantly; this one can sit on a slow network for seconds, and
 * a node that shows nothing during those seconds is indistinguishable from a
 * node that is broken.
 */
@Component({
  standalone: true,
  selector: 'fb-request-small',
  template: `
    <div class="top">
      <span class="method">{{worker?.method ?? 'GET'}}</span>
      <span class="spinner" [class.spinning]="worker?.loading"></span>
    </div>

    <span class="value" [class.error]="!!worker?.error">{{value}}</span>

    @if (worker?.size && !worker?.error) {
      <span class="size">{{worker?.size}}</span>
    }
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 3px;
      justify-content: center;
      padding: 10px 12px;
      width: 150px;
    }

    .top {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .method {
      letter-spacing: 0.1em;
      opacity: 0.75;
    }

    /*
     * A ring with one bright quarter. It is always there, so the node does not
     * change size when a request starts — only its turning says anything.
     */
    .spinner {
      border: 2px solid rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      border-top-color: rgba(255, 255, 255, 0.18);
      display: inline-block;
      height: 13px;
      width: 13px;
    }

    .spinner.spinning {
      animation: fb-spin 800ms linear infinite;
      border-top-color: #bada55;
    }

    @keyframes fb-spin {
      to { transform: rotate(360deg); }
    }

    /* A still ring for anyone who does not want movement on their screen. */
    @media (prefers-reduced-motion: reduce) {
      .spinner.spinning {
        animation: none;
      }
    }

    .value {
      font-size: 14px;
      min-height: 1.2em;
      text-align: center;
    }

    .value.error {
      color: #ff8aa8;
      font-size: 10px;
      line-height: 1.3;
    }

    .size {
      font-variant-numeric: tabular-nums;
      opacity: 0.6;
    }
  `]
})
export class RequestSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: RequestWorker;
  private readonly subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.worker = this.service.worker as RequestWorker;

    if (!this.worker) {
      return;
    }

    // Two sources: an answer, and the start or end of waiting for one. The
    // spinner is the whole reason for the second.
    this.subscriptions.push(
      this.worker.getStream().subscribe(() => this.cdr.detectChanges()),
      this.worker.changes.subscribe(() => this.cdr.detectChanges()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  get value(): string {
    if (!this.worker) {
      return '';
    }

    if (this.worker.error) {
      return this.worker.error;
    }

    if (!this.worker.received) {
      return this.worker.loading ? 'asking…' : 'not asked yet';
    }

    return this.worker.received > 1
      ? `${this.worker.status} · ${this.worker.received}×`
      : String(this.worker.status);
  }
}
