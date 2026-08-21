import { ChangeDetectorRef, Component, inject, NgZone } from '@angular/core';
import { FbModuleInfo, ModulesService } from '../../modules.service';

/**
 * Loadable modules, enabled from a list.
 *
 * Enabling downloads the module's chunk — mathjs and friends live in it, not
 * in the app — and its node types join the palette under their own group.
 * The toggle-back removes them from the palette; nodes already placed keep
 * running, because a flow is data and outlives the palette that made it.
 *
 * The second list is modules from the internet. They are the same kind of
 * thing and go down the same path, with two differences a reader can see: they
 * can be forgotten entirely, and they carry a warning. That warning is not
 * decoration — a module is code running in this page, with the flows saved in
 * this browser within reach — and it belongs next to the field rather than in
 * documentation nobody opens.
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

              @if (mod.error) {
                <span class="error">{{mod.error}}</span>
              }
            </div>

            @if (mod.url) {
              <button
                type="button"
                class="forget"
                (click)="modules.forget(mod.id)"
                [attr.aria-label]="'Forget ' + mod.title">&times;</button>
            }

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

      @if (modules.offered.length) {
        <section class="offered">
          <h3>On this playground</h3>

          <ul>
            @for (entry of modules.offered; track entry.url) {
              <li>
                <div class="text">
                  <span class="name">{{entry.title}}</span>
                  <span class="description">{{entry.description}}</span>
                </div>

                <button type="button" mat-button (click)="onAddKnown(entry.url)">Add</button>
              </li>
            }
          </ul>
        </section>
      }

      <section class="add">
        <h3>From a URL</h3>

        <!--
          Above the field, not below it. A warning under the last control is a
          warning the reader meets after deciding — and this one is clipped by
          the dialog's own scroll, so it was a warning they could miss entirely.
        -->
        <p class="warning">
          A module is code. It runs in this page with the same reach as the
          editor, including the flows saved in this browser.
        </p>

        <form (submit)="onAdd($event)">
          <input
            type="url"
            name="url"
            class="url"
            placeholder="https://…/module.js"
            aria-label="Module URL"
            [(ngModel)]="url"
            [disabled]="adding">
          <button type="submit" mat-button [disabled]="adding || !url.trim()">Add</button>
        </form>

        @if (addError) {
          <p class="error">{{addError}}</p>
        }
      </section>
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
      /* Both, or a URL with no spaces in it widens the whole dialog. */
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .name {
      font-weight: 500;
    }

    .description {
      font-size: 12px;
      opacity: 0.65;
    }

    .error {
      color: #c62828;
      font-size: 12px;
    }

    input[type=checkbox] {
      flex: 0 0 auto;
      height: 18px;
      width: 18px;
    }

    @media (pointer: coarse) {
      input[type=checkbox] { height: 28px; width: 28px; }
      .forget { min-height: 40px; min-width: 40px; }
    }

    .forget {
      background: none;
      border: none;
      cursor: pointer;
      flex: 0 0 auto;
      font-size: 18px;
      line-height: 1;
      opacity: 0.5;
      padding: 2px 6px;
    }

    .forget:hover {
      opacity: 1;
    }

    .add,
    .offered {
      border-top: 1px solid rgba(128, 128, 128, 0.3);
      margin-top: 20px;
      padding-top: 12px;
    }

    h3 {
      font-size: 12px;
      letter-spacing: 0.06em;
      margin: 0 0 8px;
      opacity: 0.6;
      text-transform: uppercase;
    }

    form {
      display: flex;
      gap: 8px;
    }

    .url {
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
    }

    .warning {
      font-size: 12px;
      margin: 0 0 10px;
      opacity: 0.7;
    }
  `]
})
export class ModulesDialogComponent {
  readonly modules = inject(ModulesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  url = '';
  adding = false;
  addError: string | null = null;

  constructor() {
    /*
     * zone.run + markForCheck: `changed` fires after a dynamic import(),
     * which zone.js does not patch — so a bare markForCheck scheduled no
     * tick and the mark sat until the next unrelated event, leaving a module
     * showing "loading" after it had finished. A bare detectChanges is no
     * good either: `changed` also fires synchronously mid-cycle (enable from
     * a click), and re-entering CD throws detectChangesInViewWhileDirty.
     * Entering the zone schedules the tick; the mark does the rest.
     */
    this.modules.changed.subscribe(() => this.zone.run(() => this.cdr.markForCheck()));

    // Fetched when the dialog opens rather than at startup: a reader who never
    // opens this never pays for it.
    void this.modules.loadCatalogue();
  }

  /** One of ours: the address is already known, so there is nothing to type. */
  async onAddKnown(url: string): Promise<void> {
    this.addError = null;

    try {
      await this.modules.addFromUrl(url);
    } catch (error) {
      this.addError = (error as Error).message;
    } finally {
      this.cdr.detectChanges();
    }
  }

  onToggle(id: string, event: Event): void {
    if ((event.target as HTMLInputElement).checked) {
      void this.modules.enable(id);
    } else {
      this.modules.disable(id);
    }
  }

  async onAdd(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.url.trim()) {
      return;
    }

    this.adding = true;
    this.addError = null;

    try {
      const info: FbModuleInfo = await this.modules.addFromUrl(this.url);

      // Cleared only on success: a URL that failed is usually one character
      // wrong, and retyping it from memory is not an improvement.
      this.url = '';
      this.addError = null;
      void info;
    } catch (error) {
      this.addError = (error as Error).message;
    } finally {
      this.adding = false;
      this.cdr.detectChanges();
    }
  }
}
