import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { FbStoredFlow, FlowStoreService } from '../../flow-store.service';

/** What the dialog resolves to; the app owns the actual switching. */
export type FbFlowsAction =
  | { kind: 'open'; id: string }
  | { kind: 'new'; title: string }
  | { kind: 'load'; url: string }
  | { kind: 'save'; title: string };

/**
 * How the dialog was opened. In `save` mode it is the "where does this land?"
 * question the Save button raises for a flow that has no home yet, so the name
 * field is primed and the load-from-URL field is out of the way.
 */
export interface FbFlowsData {
  mode?: 'save';
  title?: string;
}

/**
 * The saved flows: open one, start a new one, drop one.
 *
 * The list is what localStorage holds — the autosave keeps every flow's entry
 * fresh, so "most recently touched" is the natural order. Deleting the flow
 * that is on screen is deliberately not offered; closing what you are
 * standing on is a different decision than tidying the shelf.
 */
@Component({
  standalone: false,
  selector: 'fb-flows-dialog',
  template: `
    <h2 mat-dialog-title>{{saveMode ? 'Save flow' : 'Flows'}}</h2>

    <mat-dialog-content>
      @if (saveMode) {
        <p class="prompt">This flow is only in memory. Give it a name to keep it here.</p>
      }

      <ul>
        @for (flow of flows; track flow.id) {
          <li>
            <button type="button" class="open" [class.current]="flow.id === currentId"
                    (click)="onOpen(flow)">
              <span class="name">{{flow.title}}</span>
              <span class="when">{{when(flow)}}</span>
            </button>

            @if (flow.id !== currentId) {
              <button type="button" class="delete" aria-label="Delete"
                      (click)="onDelete(flow)">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </li>
        } @empty {
          <p class="empty">No saved flows yet.</p>
        }
      </ul>

      <form class="new" (submit)="onNew($event)">
        <input type="text" [placeholder]="saveMode ? 'Name for this flow' : 'Name for a new flow'"
               [(ngModel)]="name" name="name">
        <button type="submit" mat-stroked-button [disabled]="!name.trim()">
          {{saveMode ? 'Save' : 'New flow'}}
        </button>
      </form>

      <!--
      Loading from a URL is a browsing act, not a saving one: hidden in save
      mode, where the only question is where the flow in hand should land.
      -->
      @if (!saveMode) {
        <form class="from-url" (submit)="onLoadUrl($event)">
          <input type="url" placeholder="Load from a URL" [(ngModel)]="url" name="url">
          <button type="submit" mat-stroked-button [disabled]="!url.trim()">Load</button>
        </form>
      }
    </mat-dialog-content>

    <mat-dialog-actions>
      <!--
      A browser that saw an earlier version of the app carries the flows it
      seeded then — the old demo and tno on the shelf. Reset wipes the local
      flows so the next load lands on the shipped default, the way a fresh
      browser does. Only in browse mode: it is not an answer to "where do I
      save this?".
      -->
      @if (!saveMode) {
        <button type="button" mat-button class="reset" (click)="onReset()">Reset local flows</button>
      }
      <span class="spacer"></span>
      <button type="button" mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 4px;
      list-style: none;
      margin: 0 0 14px;
      padding: 0;
    }

    li {
      align-items: center;
      display: flex;
      gap: 6px;
    }

    .open {
      align-items: baseline;
      background: rgba(127, 127, 127, 0.08);
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex: 1;
      gap: 10px;
      justify-content: space-between;
      padding: 10px 12px;
      text-align: left;
    }

    .open.current {
      border-color: #3f51b5;
    }

    .open:hover {
      background: rgba(63, 81, 181, 0.12);
    }

    .name {
      font-weight: 500;
    }

    .when {
      font-size: 11px;
      opacity: 0.6;
    }

    .delete {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.6;
      padding: 4px;
    }

    .delete:hover {
      opacity: 1;
    }

    .empty {
      opacity: 0.6;
    }

    .prompt {
      margin: 0 0 12px;
      opacity: 0.75;
    }

    .new,
    .from-url {
      display: flex;
      gap: 8px;
    }

    .from-url {
      border-top: 1px solid rgba(127, 127, 127, 0.2);
      margin-top: 12px;
      padding-top: 12px;
    }

    .new input,
    .from-url input {
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
    }

    .spacer {
      flex: 1;
    }

    .reset {
      opacity: 0.7;
    }
  `]
})
export class FlowsDialogComponent {
  private readonly store = inject(FlowStoreService);
  private readonly ref = inject(MatDialogRef<FlowsDialogComponent, FbFlowsAction>);
  private readonly data = inject<FbFlowsData | null>(MAT_DIALOG_DATA, { optional: true });

  flows: FbStoredFlow[] = this.store.list();
  currentId = this.store.currentId();
  readonly saveMode = this.data?.mode === 'save';
  name = this.saveMode ? (this.data?.title ?? '') : '';
  url = '';

  onOpen(flow: FbStoredFlow): void {
    this.ref.close({ kind: 'open', id: flow.id });
  }

  /** The name form: a home for the flow in hand (save mode) or a fresh one. */
  onNew(event: Event): void {
    event.preventDefault();

    if (this.name.trim()) {
      this.ref.close(this.saveMode
        ? { kind: 'save', title: this.name.trim() }
        : { kind: 'new', title: this.name.trim() });
    }
  }

  onLoadUrl(event: Event): void {
    event.preventDefault();

    if (this.url.trim()) {
      this.ref.close({ kind: 'load', url: this.url.trim() });
    }
  }

  onDelete(flow: FbStoredFlow): void {
    this.store.remove(flow.id);
    this.flows = this.store.list();
  }

  /**
   * Wipe the local flows and reload onto the shipped default.
   *
   * Confirmed first: this throws away anything the person made here, not only
   * the old seeds. A reload is the simplest way to reach a clean start — the
   * app's boot does the rest, exactly as it does for a fresh browser.
   */
  onReset(): void {
    if (!confirm('Remove all locally stored flows and reload? This cannot be undone.')) {
      return;
    }

    this.store.reset();
    location.reload();
  }

  when(flow: FbStoredFlow): string {
    const minutes = Math.round((Date.now() - flow.updated) / 60_000);

    if (minutes < 1) {
      return 'just now';
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);

    return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
  }
}
