import { Component } from '@angular/core';
import { CustomCodeView } from './custom-code-view';

/**
 * At rest: that this is code, and whether it currently runs. The function
 * itself needs an editor, and an editor needs an open node.
 */
@Component({
  standalone: false,
  selector: 'fb-custom-code-small',
  template: `
    <span class="glyph">ƒ</span>
    <span class="status" [class.bad]="hasCompileError || hasRuntimeError">
      {{hasCompileError ? 'compile error' : hasRuntimeError ? 'runtime error' : 'ok'}}
    </span>
  `,
  styles: [`
    :host {
      align-items: center;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 2px;
      justify-content: center;
      padding: 6px 10px;
      width: 96px;
    }

    .glyph {
      font-size: 22px;
      font-style: italic;
    }

    .status {
      opacity: 0.6;
    }

    .status.bad {
      color: var(--fb-reject-color, #f06);
      opacity: 1;
    }
  `]
})
export class CustomCodeSmallComponent extends CustomCodeView {
}
