import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FbNodeSettings, NodeService } from '@scaljeri/flow-based';

/*
 * The two annotation types: a note, and a frame.
 *
 * Neither computes and neither has sockets — flows are read more than run,
 * and these are for the person EDITING the flow. The document view is the
 * reader's register; this is the author's margin. A frame differs from a
 * subflow on purpose: it labels a region and hides nothing, where a subflow
 * is a boundary — an author who just wants a labelled cluster should not
 * have to pay for encapsulation.
 */

/*
 * `addableSockets: 'none'` on both: an annotation computes nothing, so a
 * socket on one is a socket that lies — drawable, connectable, and forever
 * silent. The panel's + in/+ out buttons stay away entirely.
 */
export const NOTE_SETTINGS: FbNodeSettings = {
  title: 'Note',
  config: { text: 'Say why, not what.' },
  resizable: true,
  sockets: [],
  addableSockets: 'none',
};

export const FRAME_SETTINGS: FbNodeSettings = {
  title: 'Frame',
  config: { label: 'These belong together', description: '' },
  resizable: true,
  sockets: [],
  addableSockets: 'none',
};

/** The note's prose, edited where it stands. */
@Component({
  standalone: true,
  selector: 'fb-note-small',
  template: `
    <textarea
      spellcheck="false"
      [value]="text"
      (change)="onText($event)"
      (keydown)="$event.stopPropagation()"
      (pointerdown)="$event.stopPropagation()"></textarea>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 60px;
      min-width: 140px;
    }

    textarea {
      background: rgba(255, 235, 160, 0.12);
      border: 0;
      box-sizing: border-box;
      color: #ffe9a8;
      display: block;
      font: 12px/1.5 system-ui, sans-serif;
      height: 100%;
      padding: 8px 10px;
      resize: none;
      width: 100%;
    }

    textarea:focus {
      outline: 1px solid rgba(255, 235, 160, 0.5);
    }
  `]
})
export class NoteSmallComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get text(): string {
    return (this.service.state.config as { text?: string } | undefined)?.text ?? '';
  }

  onText(event: Event): void {
    ((this.service.state.config ??= {}) as { text?: string }).text =
      (event.target as HTMLTextAreaElement).value;
    this.cdr.detectChanges();
  }
}

/**
 * The frame's border and its label, drawn to be READ.
 *
 * Not editable in place: a frame is set through its config panel (a long
 * press opens it), the same as everything else about it. The label used to
 * be a live `<input>` in the drawing, which made the annotation the one
 * thing on the canvas you edited by typing on it rather than in the panel —
 * an inconsistency, and a press-trap over the very surface used to move the
 * frame. Now it is text. The optional description sits under it, smaller.
 */
@Component({
  standalone: true,
  selector: 'fb-frame-small',
  template: `
    <div class="label">{{label}}</div>
    @if (description) {
      <div class="description">{{description}}</div>
    }
  `,
  styles: [`
    :host {
      border: 1.5px dashed rgba(255, 255, 255, 0.35);
      border-radius: 10px;
      box-sizing: border-box;
      display: block;
      height: 100%;
      min-height: 120px;
      min-width: 180px;
      padding: 6px 10px;
    }

    .label {
      color: rgba(255, 255, 255, 0.6);
      font: 12px system-ui, sans-serif;
    }

    .description {
      color: rgba(255, 255, 255, 0.4);
      font: 11px system-ui, sans-serif;
      margin-top: 2px;
    }
  `]
})
export class FrameSmallComponent {
  private readonly service = inject(NodeService);

  get label(): string {
    return (this.service.state.config as { label?: string } | undefined)?.label ?? '';
  }

  get description(): string {
    return (this.service.state.config as { description?: string } | undefined)?.description ?? '';
  }
}

/** A frame's name and its optional description — the only way to set them. */
@Component({
  standalone: true,
  selector: 'fb-frame-settings',
  template: `
    <label class="field">
      <span class="label">Name</span>
      <input type="text" autocomplete="off" spellcheck="false"
             [value]="read('label')" placeholder="These belong together"
             (change)="write('label', $event)">
    </label>

    <label class="field">
      <span class="label">Description — optional</span>
      <textarea rows="2" spellcheck="false"
                [value]="read('description')" placeholder="what they have in common"
                (change)="write('description', $event)"></textarea>
    </label>
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
    textarea {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      box-sizing: border-box;
      color: #fff;
      font: inherit;
      padding: 6px 8px;
      resize: vertical;
      width: 100%;
    }
  `]
})
export class FrameSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  read(key: 'label' | 'description'): string {
    return (this.service.state.config as Record<string, string> | undefined)?.[key] ?? '';
  }

  write(key: 'label' | 'description', event: Event): void {
    ((this.service.state.config ??= {}) as Record<string, string>)[key] =
      (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    // The drawing reads from config; the shell has to be told to look again.
    this.service.refresh();
    this.cdr.detectChanges();
  }
}
