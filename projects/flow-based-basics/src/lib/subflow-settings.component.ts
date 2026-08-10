import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FbNodeState, NodeService } from '@scaljeri/flow-based';

/**
 * Which of its own nodes a subflow wears on the outside.
 *
 * A subflow is a box with sockets, and every subflow looks like every other
 * one. Letting it show one of its children is how it gets a face: a subflow
 * that fetches can show its request, one that decides something can show its
 * own control. Unchosen, the node draws a small picture of its graph instead —
 * which is honest, and says nothing about what the flow is FOR.
 *
 * The choice is stored as the child's id rather than its index: nodes are
 * added and removed, and an index would silently start pointing at a different
 * node.
 */
@Component({
  standalone: true,
  selector: 'fb-subflow-settings',
  template: `
    <label class="field">
      <span>Show on the outside</span>

      <select [value]="preview" (change)="onPreview($event)">
        <option value="">A picture of the graph</option>

        @for (child of children; track child.id) {
          <option [value]="child.id">{{child.title || child.type}}</option>
        }
      </select>
    </label>

    <p class="state">
      The chosen node is drawn at its own smallest size — the picture it shows
      when it is one node among many.
    </p>

    <!--
      The subflow's parameters: its flow-param children, editable from OUT
      here without entering the graph. Written through the subflow's worker
      (params.<name>), so the running param re-emits — a bare config write
      would persist and change nothing on the wires.
    -->
    @if (params.length) {
      <div class="params">
        <span class="heading">Parameters</span>

        @for (param of params; track param.id) {
          <label class="field">
            <span>{{name(param)}}</span>
            <input [type]="kind(param) === 'number' ? 'number' : 'text'"
                   autocomplete="off" spellcheck="false"
                   [value]="value(param)"
                   (change)="onParam(param, $event)">
          </label>
        }
      </div>
    }
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

    select {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    option {
      color: #000;
    }

    .state {
      margin: 0;
      opacity: 0.65;
    }

    .params {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
      padding-top: 10px;
    }

    .heading {
      opacity: 0.8;
    }

    .params input {
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
export class SubflowSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get children(): FbNodeState[] {
    return (this.service.state.children ?? []) as FbNodeState[];
  }

  get preview(): string {
    const chosen = (this.service.state.config as { preview?: number } | undefined)?.preview;

    return typeof chosen === 'number' ? String(chosen) : '';
  }

  get params(): FbNodeState[] {
    return this.children.filter(child => child.type === 'flow-param');
  }

  name(param: FbNodeState): string {
    return (param.config as { name?: string } | undefined)?.name || param.title || 'param';
  }

  kind(param: FbNodeState): string {
    return (param.config as { kind?: string } | undefined)?.kind === 'string' ? 'string' : 'number';
  }

  value(param: FbNodeState): string {
    const value = (param.config as { value?: unknown } | undefined)?.value;

    return value === undefined || value === null ? '' : String(value);
  }

  onParam(param: FbNodeState, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = this.kind(param) === 'number' ? Number(raw) : raw;

    if (typeof value === 'number' && Number.isNaN(value)) {
      return;
    }

    this.service.worker?.setConfigValue?.(`params.${this.name(param)}`, value);
    this.cdr.detectChanges();
  }

  onPreview(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const config = (this.service.state.config ??= {}) as { preview?: number };

    if (value) {
      config.preview = Number(value);
    } else {
      delete config.preview;
    }

    /*
     * The shell decides what to mount from this and would not otherwise
     * notice: nothing about a config write reaches it. `refresh` is exactly
     * that message — look at this node again.
     */
    this.service.refresh();
    this.cdr.detectChanges();
  }
}
