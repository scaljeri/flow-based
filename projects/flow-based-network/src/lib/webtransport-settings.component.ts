import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { WebTransportConfig, WebTransportWorker } from './webtransport.worker';

/** Where the datagrams go, and what the stream calls itself. */
@Component({
  standalone: true,
  selector: 'fb-webtransport-settings',
  template: `
    <label class="field">
      <span class="label">URL — an https:// HTTP/3 endpoint speaking WebTransport</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('url')" placeholder="https://example.org:4433/telemetry"
             (change)="write('url', $event)">
    </label>

    <label class="field">
      <span class="label">Stream name — empty uses the URL</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('title')" placeholder="telemetrie"
             (change)="write('title', $event)">
    </label>

    <p class="state">
      Datagrams are UDP's character on the web: unordered, unreliable, and
      allowed to vanish. Browser support is still uneven.
    </p>
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

    .state {
      margin: 0;
      opacity: 0.65;
    }
  `]
})
export class WebTransportSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): WebTransportWorker | undefined {
    return this.service.worker as WebTransportWorker | undefined;
  }

  read(key: keyof WebTransportConfig): string {
    return this.worker?.read(key) ?? '';
  }

  write(key: keyof WebTransportConfig, event: Event): void {
    this.worker?.write(key, (event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }
}
