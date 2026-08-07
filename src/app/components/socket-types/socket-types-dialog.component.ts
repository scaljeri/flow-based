import { ChangeDetectorRef, Component, Inject, Optional, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { typeScriptOf } from '@scaljeri/flow-based-core';
import { ModulesService } from '../../modules.service';

/**
 * The book of data types, open at a page.
 *
 * Every socket carries a type, and until now the only way to learn what one
 * meant was to press it and read a line. This is the whole book: pick a type
 * and see everything known about it — what it is, what it refines, what it
 * looks like as a type, and the definition itself as JSON.
 *
 * Opened from the menu with nothing chosen, or from the `i` on a pressed
 * socket with that socket's type already selected — the same page either way,
 * reached from the two places a reader would ask the question.
 */
@Component({
  standalone: false,
  selector: 'fb-socket-types-dialog',
  template: `
    <h2 mat-dialog-title>Socket types</h2>

    <mat-dialog-content>
      <label class="field">
        <span>Type</span>

        <!--
          Marked on the OPTION, not as the select's value. A native select is
          given its value before Angular has rendered the options, so binding
          it there left the control showing the first type while the page
          below it described another one.
        -->
        <select (change)="onSelect($event)">
          @for (name of names; track name) {
            <option [value]="name" [selected]="name === selected">{{name}}</option>
          }
        </select>
      </label>

      @if (chosen) {
        <p class="what">{{chosen.description || 'No description was given for this type.'}}</p>

        @if (signature) {
          <pre class="signature">{{signature}}</pre>
        }

        <h3>Definition</h3>

        <!--
          The definition as it stands, formatted rather than crammed onto one
          line: this is meant to be read, and a type is a nested thing.
        -->
        <pre class="json">{{json}}</pre>
      } @else {
        <p class="what">No types are registered yet. Enable a module.</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }

    .field span {
      font-size: 12px;
      opacity: 0.7;
    }

    select {
      box-sizing: border-box;
      font: inherit;
      padding: 6px 8px;
      width: 100%;
    }

    .what {
      margin: 0 0 12px;
    }

    h3 {
      font-size: 12px;
      letter-spacing: 0.06em;
      margin: 0 0 6px;
      opacity: 0.6;
      text-transform: uppercase;
    }

    /*
     * Both scroll sideways rather than wrapping. A type is read along its
     * nesting, and a line broken at an arbitrary column is harder to follow
     * than one you have to push.
     */
    .signature, .json {
      background: rgba(128, 128, 128, 0.12);
      border-radius: 6px;
      font: 12px/1.5 ui-monospace, monospace;
      margin: 0 0 12px;
      overflow-x: auto;
      padding: 8px 10px;
      white-space: pre;
    }
  `]
})
export class SocketTypesDialogComponent {
  private readonly modules = inject(ModulesService);
  private readonly cdr = inject(ChangeDetectorRef);

  selected: string;

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) data?: { format?: string }) {
    // Opened from a socket, the answer is already known; from the menu, the
    // first type is as good a page to open at as any.
    this.selected = data?.format && this.names.includes(data.format)
      ? data.format
      : this.names[0] ?? '';
  }

  get names(): string[] {
    return this.modules.formats.list().map(def => def.name).sort();
  }

  get chosen() {
    return this.selected ? this.modules.formats.get(this.selected) : undefined;
  }

  /** The type the way a programmer reads types, when the module wrote one. */
  get signature(): string {
    const shape = this.chosen?.shape;

    return shape ? `type ${this.selected} = ${typeScriptOf(shape)}` : '';
  }

  get json(): string {
    return this.chosen ? JSON.stringify(this.chosen, null, 2) : '';
  }

  onSelect(event: Event): void {
    this.selected = (event.target as HTMLSelectElement).value;
    this.cdr.detectChanges();
  }
}
