import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FbNoDragDirective, NodeService } from '@scaljeri/flow-based';
import { ConvertWorker } from './convert.worker';

/** A cast at rest is its target: pick what to convert to; the error shows if it can't. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-convert-small',
  template: `
    <select fbNoDrag aria-label="Convert to" (change)="setTo($event)">
      <option value="number" [selected]="worker?.to === 'number'">→ number</option>
      <option value="text" [selected]="worker?.to === 'text'">→ text</option>
      <option value="json" [selected]="worker?.to === 'json'">→ data (parse JSON)</option>
    </select>
    @if (worker?.error) {
      <span class="error" [title]="worker?.error ?? ''">!</span>
    }
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      font: 12px system-ui, sans-serif;
      gap: 8px;
      padding: 8px 10px;
    }

    select {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      padding: 3px 6px;
    }

    select option { color: #000; }

    .error {
      background: #c62828;
      border-radius: 50%;
      color: #fff;
      font-weight: 700;
      height: 16px;
      line-height: 16px;
      text-align: center;
      width: 16px;
    }
  `]
})
export class ConvertSmallComponent implements OnInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  worker?: ConvertWorker;

  private subscription?: Subscription;

  ngOnInit(): void {
    this.worker = this.service.worker as ConvertWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  setTo(event: Event): void {
    this.worker?.setConfigValue('to', (event.target as HTMLSelectElement).value);
    this.cdr.detectChanges();
  }
}
