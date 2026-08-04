import { Component, HostBinding, inject } from '@angular/core';
import { FB_SOCKET_COLORS } from '@scaljeri/flow-based';
import { CustomCodeEditor } from './custom-code-editor';

/** The whole surface: the same editor, with all the room there is. */
@Component({
  standalone: false,
  selector: 'fb-custom-code-full',
  templateUrl: './custom-code-open.component.html',
  styleUrls: ['./custom-code-open.component.scss'],
})
export class CustomCodeFullComponent extends CustomCodeEditor {
  private colors = inject<Record<string, string>>(FB_SOCKET_COLORS);

  @HostBinding('class.fills') readonly fills = true;

  override get types(): string[] {
    return Object.keys(this.colors);
  }
}
