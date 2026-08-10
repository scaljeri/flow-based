import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { WebSocketConfig, WebSocketWorker } from './websocket.worker';

/** Where the line goes, and what the stream calls itself downstream. */
@Component({
  standalone: true,
  selector: 'fb-websocket-settings',
  template: `
    <label class="field">
      <span class="label">URL (ws:// or wss://)</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('url')" placeholder="wss://example.org/stream"
             (change)="write('url', $event)">
    </label>

    <label class="field">
      <span class="label">Stream name — empty uses the URL</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('title')" placeholder="metingen"
             (change)="write('title', $event)">
    </label>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 8px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      opacity: 0.8;
    }

    input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }
  `]
})
export class WebSocketSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): WebSocketWorker | undefined {
    return this.service.worker as WebSocketWorker | undefined;
  }

  read(key: keyof WebSocketConfig): string {
    return this.worker?.read(key) ?? '';
  }

  write(key: keyof WebSocketConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }
}
