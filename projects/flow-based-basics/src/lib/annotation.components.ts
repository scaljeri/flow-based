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
  config: { label: 'These belong together' },
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

/** The frame's border and its label; the shell keeps it behind the nodes. */
@Component({
  standalone: true,
  selector: 'fb-frame-small',
  template: `
    <input
      type="text"
      autocomplete="off"
      spellcheck="false"
      [value]="label"
      (change)="onLabel($event)"
      (keydown)="$event.stopPropagation()"
      (pointerdown)="$event.stopPropagation()">
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
    }

    input {
      background: none;
      border: 0;
      color: rgba(255, 255, 255, 0.6);
      font: 12px system-ui, sans-serif;
      padding: 6px 10px;
      width: calc(100% - 20px);
    }

    input:focus {
      color: #fff;
      outline: none;
    }
  `]
})
export class FrameSmallComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get label(): string {
    return (this.service.state.config as { label?: string } | undefined)?.label ?? '';
  }

  onLabel(event: Event): void {
    ((this.service.state.config ??= {}) as { label?: string }).label =
      (event.target as HTMLInputElement).value;
    this.cdr.detectChanges();
  }
}
