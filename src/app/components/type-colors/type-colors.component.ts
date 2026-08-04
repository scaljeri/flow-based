import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FlowBasedService } from '@scaljeri/flow-based';

/**
 * Colours, per data type.
 *
 * A connection's colour is the format crossing it, so the colour belongs to the
 * TYPE — one choice that then means the same thing on every socket and every
 * line that carries it. Choosing it per socket, which is where the picker used
 * to live, made the same type able to look like two different ones.
 *
 * The list shows only the types in use: a type exists here in the sense that
 * something in the document carries it, and rows for hypothetical types would
 * be settings for nothing. Colouring is on by default and can be switched off
 * whole — for a screenshot, or when the palette fights the colours a node's own
 * content uses.
 *
 * Opened from the toolbar's overflow menu, where later editor-wide concerns
 * (backends, and so on) will join it.
 */
@Component({
  standalone: false,
  selector: 'fb-type-colors',
  template: `
    <h2 mat-dialog-title>Data types</h2>
    
    <mat-dialog-content>
      <label class="toggle">
        <span>Colour by data type</span>
        <input
          type="checkbox"
          [checked]="enabled"
          (change)="onToggle($event)">
      </label>
    
      @if (types.length) {
        <ul [class.disabled]="!enabled">
          @for (type of types; track type) {
            <li>
              <span class="name">{{type}}</span>
              <input
                type="color"
                [value]="colorOf(type)"
                [disabled]="!enabled"
                (input)="onColor(type, $event)">
            </li>
          }
        </ul>
      } @else {
        <p class="empty">No data types in use yet — they come from the nodes in the flow.</p>
      }
    
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
    `,
  styles: [`
    mat-dialog-content {
      min-width: 260px;
    }

    .toggle {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .toggle input {
      height: 18px;
      width: 18px;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    ul.disabled {
      opacity: 0.45;
    }

    li {
      align-items: center;
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
    }

    .name {
      font-family: monospace;
    }

    input[type='color'] {
      background: none;
      border: none;
      block-size: 28px;
      cursor: pointer;
      inline-size: 44px;
      padding: 0;
    }

    .empty {
      opacity: 0.6;
    }
  `]
})
export class TypeColorsComponent {
  private readonly flowService = inject(FlowBasedService);
  private readonly cdr = inject(ChangeDetectorRef);

  get types(): string[] {
    return this.flowService.editor?.formatsInDocument() ?? [];
  }

  get enabled(): boolean {
    return this.flowService.editor?.colorsEnabled ?? true;
  }

  colorOf(type: string): string {
    return this.flowService.editor?.socketColors[type] ?? '#ffffff';
  }

  onToggle(event: Event): void {
    this.flowService.editor?.setColorsEnabled((event.target as HTMLInputElement).checked);
    this.cdr.markForCheck();
  }

  onColor(type: string, event: Event): void {
    this.flowService.editor?.setTypeColor(type, (event.target as HTMLInputElement).value);
  }
}
