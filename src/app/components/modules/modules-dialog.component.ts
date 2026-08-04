import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ModulesService } from '../../modules.service';

/**
 * Loadable modules, enabled from a list.
 *
 * Enabling downloads the module's chunk — mathjs and friends live in it, not
 * in the app — and its node types join the palette under their own group.
 * The toggle-back removes them from the palette; nodes already placed keep
 * running, because a flow is data and outlives the palette that made it.
 */
@Component({
  standalone: false,
  selector: 'fb-modules-dialog',
  template: `
    <h2 mat-dialog-title>Modules</h2>

    <mat-dialog-content>
      <ul>
        @for (mod of modules.modules; track mod.id) {
          <li>
            <div class="text">
              <span class="name">{{mod.title}}</span>
              <span class="description">{{mod.description}}</span>
            </div>

            @if (mod.loading) {
              <mat-spinner diameter="22"></mat-spinner>
            } @else {
              <input
                type="checkbox"
                [checked]="mod.enabled"
                (change)="onToggle(mod.id, $event)"
                [attr.aria-label]="'Enable ' + mod.title">
            }
          </li>
        }
      </ul>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 280px;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 14px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .name {
      font-weight: 500;
    }

    .description {
      font-size: 12px;
      opacity: 0.65;
    }

    input {
      flex: 0 0 auto;
      height: 18px;
      width: 18px;
    }
  `]
})
export class ModulesDialogComponent {
  readonly modules = inject(ModulesService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.modules.changed.subscribe(() => this.cdr.markForCheck());
  }

  onToggle(id: string, event: Event): void {
    if ((event.target as HTMLInputElement).checked) {
      void this.modules.enable(id);
    } else {
      this.modules.disable(id);
    }
  }
}
