import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FbStoredFlow, FlowStoreService } from '../../flow-store.service';

/** What the dialog resolves to; the app owns the actual switching. */
export type FbFlowsAction =
  | { kind: 'open'; id: string }
  | { kind: 'new'; title: string };

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
    <h2 mat-dialog-title>Flows</h2>

    <mat-dialog-content>
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
        <input type="text" placeholder="Name for a new flow" [(ngModel)]="name" name="name">
        <button type="submit" mat-stroked-button [disabled]="!name.trim()">New flow</button>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
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

    .new {
      display: flex;
      gap: 8px;
    }

    .new input {
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
    }
  `]
})
export class FlowsDialogComponent {
  private readonly store = inject(FlowStoreService);
  private readonly ref = inject(MatDialogRef<FlowsDialogComponent, FbFlowsAction>);

  flows: FbStoredFlow[] = this.store.list();
  currentId = this.store.currentId();
  name = '';

  onOpen(flow: FbStoredFlow): void {
    this.ref.close({ kind: 'open', id: flow.id });
  }

  onNew(event: Event): void {
    event.preventDefault();

    if (this.name.trim()) {
      this.ref.close({ kind: 'new', title: this.name.trim() });
    }
  }

  onDelete(flow: FbStoredFlow): void {
    this.store.remove(flow.id);
    this.flows = this.store.list();
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
