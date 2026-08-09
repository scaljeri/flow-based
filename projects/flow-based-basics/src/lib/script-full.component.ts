import { Component } from '@angular/core';
import { FB_DRAG_IGNORE } from '@scaljeri/flow-based';
import { ScriptEditorView } from './script-editor-view';

/** The script with the surface to itself: 100%, which is what `full` means. */
@Component({
  standalone: true,
  selector: 'fb-script-full',
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
      height: 100%;
      width: 100%;
    }
  `]
})
export class ScriptFullComponent extends ScriptEditorView {
}
