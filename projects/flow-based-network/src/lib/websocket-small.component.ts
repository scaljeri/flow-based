import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { WebSocketWorker } from './websocket.worker';

/**
 * At rest: whether the line is open, and how much has come down it.
 *
 * A socket's STATE is its reading — open and silent is healthy in a way a
 * request never is, and closed is the first thing worth knowing when a live
 * figure stops moving.
 */
@Component({
  standalone: true,
  selector: 'fb-websocket-small',
  template: `
    <div class="top">
      <span class="dot" [attr.data-state]="worker?.state"></span>
      <span class="state">{{worker?.state}}</span>
    </div>

    <span class="count" [class.error]="!!worker?.error">
      {{worker?.error ?? (worker?.received ?? 0) + ' messages'}}
    </span>

    @if (where) {
      <span class="where" [title]="worker?.url ?? ''">{{where}}</span>
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
      gap: 6px;
    }

    .dot {
      background: #777;
      border-radius: 50%;
      height: 8px;
      width: 8px;
    }

    .dot[data-state='open'] {
      background: #bada55;
    }

    .dot[data-state='connecting'] {
      background: #fa0;
    }

    .dot[data-state='closed'] {
      background: #f06;
    }

    .state {
      opacity: 0.75;
    }

    .count {
      font-variant-numeric: tabular-nums;
    }

    .error {
      color: #ff8aa8;
    }

    .where {
      max-width: 100%;
      opacity: 0.55;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class WebSocketSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: WebSocketWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as WebSocketWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** The tail of the URL — the part that differs between two servers. */
  get where(): string {
    const url = this.worker?.url ?? '';

    return url.split('/').filter(Boolean).slice(-1)[0] ?? '';
  }
}
