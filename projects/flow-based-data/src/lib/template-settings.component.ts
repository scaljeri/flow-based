import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { TemplateWorker } from './template.worker';

/**
 * The pattern, and what it is asking for.
 *
 * The list of placeholders is not decoration: it is the list of sockets this
 * node needs, spelled the way they must be named. Getting that wrong is the
 * only way to use this node incorrectly, and it is silent — so it is written
 * down where the pattern is edited.
 */
@Component({
  standalone: true,
  selector: 'fb-template-settings',
  template: `
    <label class="field">
      <span>Pattern — a wired one wins over this</span>
      <input type="text" [value]="pattern" (input)="onPattern($event)" placeholder="data/{region|lower}/{date}.json">
    </label>

    @if (placeholders.length) {
      <p class="state">
        Name an input socket after each of these:
        <strong>{{placeholders.join(', ')}}</strong>
      </p>
    } @else {
      <p class="state">No placeholders yet. Write one as <code>&#123;name&#125;</code>.</p>
    }

    <p class="state hint">
      After a bar: <code>lower</code>, <code>upper</code>, <code>trim</code>,
      <code>url</code>. A socket named <code>pattern</code> supplies the pattern
      itself.
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

    .field span {
      opacity: 0.8;
    }

    .field input {
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
      opacity: 0.75;
    }

    .hint {
      opacity: 0.55;
    }

    code {
      font-family: ui-monospace, monospace;
    }
  `]
})
export class TemplateSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): TemplateWorker | undefined {
    return this.service.worker as TemplateWorker | undefined;
  }

  get pattern(): string {
    return this.worker?.pattern ?? '';
  }

  get placeholders(): string[] {
    return this.worker?.placeholders ?? [];
  }

  // On input, not on blur: a pattern is something you feel your way to, and
  // the node redraws what it is still missing as you type.
  onPattern(event: Event): void {
    this.worker?.setPattern((event.target as HTMLInputElement).value);
    this.cdr.detectChanges();
  }
}
