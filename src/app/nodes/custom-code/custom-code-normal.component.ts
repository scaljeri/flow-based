import { Component, inject } from '@angular/core';
import { FB_SOCKET_COLORS } from '@scaljeri/flow-based';
import { CustomCodeEditor } from './custom-code-editor';

/** Opened in place: the editor at panel width, next to its neighbours. */
@Component({
  standalone: false,
  selector: 'fb-custom-code-normal',
  templateUrl: './custom-code-open.component.html',
  styleUrls: ['./custom-code-open.component.scss'],
})
export class CustomCodeNormalComponent extends CustomCodeEditor {
  private colors = inject<Record<string, string>>(FB_SOCKET_COLORS);


  override get types(): string[] {
    return Object.keys(this.colors);
  }
}
