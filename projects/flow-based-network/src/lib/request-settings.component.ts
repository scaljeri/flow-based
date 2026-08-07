import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { RequestConfig, RequestMethod, RequestWorker } from './request.worker';

/**
 * Where to ask, how, and how often.
 *
 * No headers and no credentials, deliberately: a node's config travels in the
 * flow's JSON, which gets downloaded, shared and embedded, so a field for an
 * API key would be a field for leaking one.
 */
@Component({
  standalone: true,
  selector: 'fb-request-settings',
  template: `
    <label class="field">
      <span class="label">URL</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('url')" placeholder="https://example.org/data.json"
             (change)="write('url', $event)">
    </label>

    <!--
      What this source IS. It travels with the data, because a node further
      down cannot work it out from an array of numbers — and this is the one
      place that knows.
    -->
    <label class="field">
      <span class="label">Name</span>
      <input type="text" autocomplete="off"
             [value]="read('title')" placeholder="Where this comes from"
             (change)="write('title', $event)">
    </label>

    <label class="field">
      <span class="label">Description</span>
      <input type="text" autocomplete="off"
             [value]="read('description')" placeholder="What this source is"
             (change)="write('description', $event)">
    </label>

    <label class="field">
      <span class="label">Method</span>
      <select [value]="method" (change)="write('method', $event)">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
      </select>
    </label>

    @if (method === 'POST') {
      <label class="field">
        <span class="label">Body</span>
        <textarea rows="3" spellcheck="false"
                  [value]="read('body')" (change)="write('body', $event)"></textarea>
      </label>
    }

    <label class="field">
      <span class="label">Repeat every (ms) — 0 asks once</span>
      <input type="text" inputmode="numeric" autocomplete="off"
             [value]="read('every')" (change)="write('every', $event)">
    </label>

    <p class="state" [class.error]="!!worker?.error">
      {{worker?.error ?? (worker?.received ?? 0) + ' answers, last status ' + (worker?.status ?? 0)}}
    </p>

    <button type="button" class="send" (click)="send()">Ask now</button>
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

    input,
    select,
    textarea {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    select option {
      background: #222;
    }

    .state {
      margin: 0;
      opacity: 0.75;
    }

    .state.error {
      color: #ff8aa8;
      opacity: 1;
    }

    .send {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      min-height: 32px;
    }
  `]
})
export class RequestSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): RequestWorker | undefined {
    return this.service.worker as RequestWorker | undefined;
  }

  get method(): RequestMethod {
    return this.worker?.method ?? 'GET';
  }

  read(key: keyof RequestConfig): string {
    const value = this.worker?.read(key) ?? (this.service.state.config as RequestConfig)?.[key];

    return value === undefined ? '' : String(value);
  }

  write(key: keyof RequestConfig, event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;

    this.worker?.set(key, key === 'every' ? Number(raw) || 0 : raw);
    this.cdr.detectChanges();
  }

  send(): void {
    void this.worker?.send();
    this.cdr.detectChanges();
  }
}
