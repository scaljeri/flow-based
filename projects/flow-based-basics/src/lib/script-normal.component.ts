import { Component } from '@angular/core';
import { FB_DRAG_IGNORE } from '@scaljeri/flow-based';
import { ScriptEditorView } from './script-editor-view';

/**
 * The script opened in place: a panel next to the graph rather than a page.
 *
 * Sized in pixels, because at this size the node decides how big it is — big
 * enough for a dozen lines, which is what this node is for. The type is
 * resizable, so anyone who disagrees can drag it; the shell then writes its
 * own size over this one.
 */
@Component({
  standalone: true,
  selector: 'fb-script-normal',
  template: `
    <div #host class="editor ${FB_DRAG_IGNORE}"></div>

    <footer [class.bad]="!!problem">
      @if (problem) {
        <span class="problem">{{problem}}</span>
      } @else {
        <span>{{worker?.runs ?? 0}} in · {{worker?.emitted ?? 0}} out</span>
      }
    </footer>
  `,
  styleUrls: ['./script-editor.scss'],
  styles: [`
    :host {
      height: 260px;
      width: 420px;
    }
  `]
})
export class ScriptNormalComponent extends ScriptEditorView {
}
