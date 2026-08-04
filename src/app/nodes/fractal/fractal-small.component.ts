import { Component, inject } from '@angular/core';
import { FbNodeState, NodeService } from '@scaljeri/flow-based';

/** At rest: which fractal this computes. Changing it lives in the settings. */
@Component({
  standalone: false,
  selector: 'fb-fractal-small',
  template: `<span class="name">{{name}}</span>`,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      font: 13px system-ui, sans-serif;
      justify-content: center;
      padding: 6px 10px;
      width: 110px;
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class FractalSmallComponent {
  private readonly service = inject(NodeService);
  private readonly state: FbNodeState = this.service.state;

  get name(): string {
    return this.state.config?.selected ?? 'none';
  }
}
