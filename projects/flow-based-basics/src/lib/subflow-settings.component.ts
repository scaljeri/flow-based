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
