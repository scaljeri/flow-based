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
      @if (problems.length) {
        <!--
          What the registry could not make sense of. A dangling base is the
          worst of them: the assignability walk follows a chain that ends
          nowhere, answers no, and a wire refuses to connect with nothing at
          all to read. (No backticks in here: this is inside a template
          literal, and one would close it.)
        -->
        <section class="problems">
          <h3>Problems</h3>

          <ul>
            @for (problem of problems; track problem) {
              <li>{{problem}}</li>
            }
          </ul>
        </section>
      }

      <!--
        A type nobody wrote a module for. A flow may need one — a station code,
        a temperature — and inventing it should not require writing code. It is
        seeded rather than registered: a hand-made type takes the name it was
        given, and a module arriving later with that name is the one that has
        to disambiguate.
      -->
      <section class="new">
        <h3>New type</h3>

        <label class="field">
          <span>Name</span>
          <input type="text" [(ngModel)]="draftName" placeholder="temperature">
        </label>

        <label class="field">
          <span>What it is — this is its identity across modules</span>
          <input type="text" [(ngModel)]="draftDescription" placeholder="Degrees Celsius">
        </label>

        <label class="field">
          <span>Refines — it may stand in for this one</span>
          <select [(ngModel)]="draftRefines">
            <option value="">nothing</option>
            @for (name of names; track name) {
              <option [value]="name">{{name}}</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Colour of its connections</span>
          <input type="color" [(ngModel)]="draftColor">
        </label>

        @if (problem) {
          <p class="problem">{{problem}}</p>
        }

        <button type="button" mat-button class="create" [disabled]="!draftName.trim()"
                (click)="create()">Create</button>
      </section>
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
    .problems {
      border-top: 1px solid rgba(128, 128, 128, 0.3);
      margin-top: 16px;
      padding-top: 12px;
    }

    .problems ul {
      margin: 0;
      padding-left: 18px;
    }

    .problems li {
      color: #b26500;
      margin-bottom: 4px;
    }

    .new {
      border-top: 1px solid rgba(128, 128, 128, 0.3);
      margin-top: 16px;
      padding-top: 12px;
    }

    .problem {
      color: #c62828;
      margin: 0 0 8px;
    }

    input[type=color] {
      height: 32px;
      padding: 2px;
      width: 100%;
    }

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

  get problems(): string[] {
    return this.modules.formats.problems;
  }

  get json(): string {
    return this.chosen ? JSON.stringify(this.chosen, null, 2) : '';
  }

  onSelect(event: Event): void {
    this.selected = (event.target as HTMLSelectElement).value;
    this.cdr.detectChanges();
  }

  draftName = '';
  draftDescription = '';
  draftRefines = '';
  draftColor = '#7f9cf5';
  problem: string | null = null;

  /**
   * Make the type, and open the page at it.
   *
   * The name is checked because a name already taken would silently do
   * nothing: `seed` leaves an existing definition alone, which is right for
   * startup and would be a lie here.
   */
  create(): void {
    const name = this.draftName.trim();

    if (!name) {
      return;
    }

    if (this.names.includes(name)) {
      this.problem = `There is already a type called ${name}.`;

      return;
    }

    this.modules.defineType({
      name,
      description: this.draftDescription.trim() || undefined,
      refines: this.draftRefines || undefined,
      color: this.draftColor,
    });

    this.problem = null;
    this.draftName = '';
    this.draftDescription = '';
    this.selected = name;
    this.cdr.detectChanges();
  }
}
