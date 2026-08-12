import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { EventSourceWorker } from './eventsource.worker';

/** At rest: whether the stream is open, and how many messages have come down it. */
@Component({
  standalone: true,
  selector: 'fb-eventsource-small',
  template: `
    <div class="top">
      <span class="dot" [attr.data-state]="worker?.state"></span>
      <span class="state">{{ worker?.state }}</span>
    </div>

    <span class="count" [class.error]="!!worker?.error">
      {{ worker?.error ?? (worker?.received ?? 0) + ' messages' }}
    </span>

    @if (where) {
      <span class="where" [title]="worker?.url ?? ''">{{ where }}</span>
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

    .top { align-items: center; display: flex; gap: 6px; }
    .dot { background: #777; border-radius: 50%; height: 8px; width: 8px; }
    .dot[data-state='open'] { background: #bada55; }
    .dot[data-state='connecting'] { background: #f0c040; }
    .dot[data-state='error'] { background: #e0533d; }
    .count { opacity: 0.8; }
    .count.error { color: #ff8a80; opacity: 1; }
    .where {
      font-size: 11px;
      max-width: 130px;
      opacity: 0.55;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class EventSourceSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: EventSourceWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as EventSourceWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get where(): string {
    const url = this.worker?.url;

    if (!url) {
      return '';
    }

    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }
}
