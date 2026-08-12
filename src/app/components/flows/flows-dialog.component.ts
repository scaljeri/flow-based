import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { serializeFlowToJson } from '@scaljeri/flow-based';

import { FbStoredFlow, FlowStoreService } from '../../flow-store.service';
import { RemoteFlowService } from '../../remote-flow.service';
import { FbJsonEditorData, JsonEditorDialogComponent } from '../json-editor/json-editor-dialog.component';

/**
 * What the dialog resolves to; the app owns the actual switching and any change
 * that touches the flow ON SCREEN (so it can reopen it). Destination and token
 * are set inside the dialog — they are shelf metadata, not the open flow's state.
 */
export type FbFlowsAction =
  | { kind: 'open'; id: string }
  | { kind: 'new'; title: string }
  | { kind: 'load'; url: string }
  | { kind: 'file'; file: File }
  | { kind: 'replace'; id: string; json: string };

/**
 * The saved flows: open one, start one (blank, from a URL, or an upload), drop
 * one — and, per flow, its DETAILS: where it saves (this device or a remote
 * endpoint), and its JSON to view/edit, download or replace.
 *
 * The list is what localStorage holds; the autosave is gone, so "most recently
 * touched" now means most recently SAVED. Deleting the flow on screen is not
 * offered — closing what you stand on is a different decision than tidying.
 */
@Component({
  standalone: false,
  selector: 'fb-flows-dialog',
  template: `
    @if (!details) {
      <h2 mat-dialog-title>Flows</h2>

      <mat-dialog-content>
        <ul>
          @for (flow of flows; track flow.id) {
            <li>
              <button type="button" class="open" [class.current]="flow.id === currentId"
                      (click)="onOpen(flow)">
                <span class="name">{{flow.title}}</span>
                <span class="when">{{when(flow)}}{{flow.endpoint ? ' · remote' : ''}}</span>
              </button>

              <button type="button" class="details-open" aria-label="Details"
                      (click)="showDetails(flow)">
                <mat-icon>settings</mat-icon>
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

        <!-- Three ways to start a flow: blank on this device, from a URL, or a
             file. Each becomes its own entry — there is no "unsaved, homeless". -->
        <div class="new-flow">
          <form class="new" (submit)="onNew($event)">
            <input type="text" placeholder="Name a new, blank flow" [(ngModel)]="name" name="name">
            <button type="submit" mat-stroked-button [disabled]="!name.trim()">New</button>
          </form>

          <form class="from-url" (submit)="onLoadUrl($event)">
            <input type="url" placeholder="…or open from a URL" [(ngModel)]="url" name="url">
            <button type="submit" mat-stroked-button [disabled]="!url.trim()">Open</button>
          </form>

          <button type="button" mat-stroked-button class="from-file" (click)="fileInput.click()">
            …or open a file
          </button>
          <input #fileInput type="file" accept="application/json,.json" class="file-input"
                 (change)="onFile($event)" aria-label="Open a flow from a JSON file">
        </div>
      </mat-dialog-content>

      <mat-dialog-actions>
        <!--
        A browser that saw an earlier version carries the flows it seeded then.
        Reset wipes the local flows so the next load lands on the shipped default,
        the way a fresh browser does.
        -->
        <button type="button" mat-button class="reset" (click)="onReset()">Reset local flows</button>
        <span class="spacer"></span>
        <button type="button" mat-button mat-dialog-close>Close</button>
      </mat-dialog-actions>
    } @else {
      <!-- DETAILS of one flow: where it saves, and its JSON. -->
      <h2 mat-dialog-title>
        <button type="button" class="back" aria-label="Back" (click)="details = null">
          <mat-icon>arrow_back</mat-icon>
        </button>
        {{details.title}}
      </h2>

      <mat-dialog-content>
        <section class="destination">
          <h3>Where this flow saves</h3>
          <label class="radio">
            <input type="radio" name="dest" value="local" [(ngModel)]="dest">
            This device (local storage)
          </label>
          <label class="radio">
            <input type="radio" name="dest" value="remote" [(ngModel)]="dest">
            A remote endpoint
          </label>

          @if (dest === 'remote') {
            <input type="url" class="endpoint" placeholder="Endpoint URL (PUT)"
                   [(ngModel)]="endpoint" name="endpoint">
            <input type="password" class="token"
                   [placeholder]="hasToken ? 'Token stored — type to replace' : 'Access token (optional)'"
                   [(ngModel)]="token" name="token">
            <!-- The token is kept apart from the flow, keyed by the endpoint's
                 origin; a flow is downloaded and shared, a credential is not. -->
            <p class="hint">The token is kept on this device only, never inside the flow.</p>
          }

          <div class="dest-actions">
            <button type="button" mat-stroked-button class="apply-dest"
                    [disabled]="dest === 'remote' && !endpoint.trim()" (click)="applyDestination()">
              Apply
            </button>
            @if (destSaved) { <span class="saved">Saved</span> }
          </div>
        </section>

        <section class="json">
          <h3>JSON</h3>
          <div class="json-actions">
            <button type="button" mat-stroked-button class="edit-json" (click)="editJson()">Edit…</button>
            <button type="button" mat-stroked-button class="download-json" (click)="downloadJson()">Download</button>
            <button type="button" mat-stroked-button class="upload-json" (click)="replaceInput.click()">Replace…</button>
            <input #replaceInput type="file" accept="application/json,.json" class="file-input"
                   (change)="onReplaceFile($event)" aria-label="Replace this flow's JSON from a file">
          </div>
          @if (detailsError) { <p class="error" role="alert">{{detailsError}}</p> }
        </section>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button type="button" mat-button class="delete-details"
                [disabled]="details.id === currentId" (click)="onDelete(details); details = null">
          Delete
        </button>
        <span class="spacer"></span>
        <button type="button" mat-button mat-dialog-close class="close-details">Close</button>
        <button type="button" mat-flat-button color="primary" class="open-details"
                (click)="onOpen(details)">Open</button>
      </mat-dialog-actions>
    }
  `,
  styles: [`
    mat-dialog-content { min-width: 320px; }

    ul {
      display: flex;
      flex-direction: column;
      gap: 4px;
      list-style: none;
      margin: 0 0 14px;
      padding: 0;
    }

    li { align-items: center; display: flex; gap: 6px; }

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

    .open.current { border-color: #3f51b5; }
    .open:hover { background: rgba(63, 81, 181, 0.12); }
    .name { font-weight: 500; }
    .when { font-size: 11px; opacity: 0.6; }

    .details-open,
    .delete {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.6;
      padding: 4px;
    }

    .details-open:hover,
    .delete:hover { opacity: 1; }

    .empty { opacity: 0.6; }

    .new-flow {
      border-top: 1px solid rgba(127, 127, 127, 0.2);
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
    }

    .new,
    .from-url { display: flex; gap: 8px; }

    .new input,
    .from-url input,
    .destination input {
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
    }

    .file-input { display: none; }

    h2[mat-dialog-title] { align-items: center; display: flex; gap: 6px; }

    .back {
      background: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      padding: 2px;
    }

    section { margin-bottom: 18px; }

    h3 {
      font-size: 12px;
      letter-spacing: 0.04em;
      margin: 0 0 8px;
      opacity: 0.7;
      text-transform: uppercase;
    }

    .radio { align-items: center; display: flex; gap: 8px; margin-bottom: 6px; }

    .destination input { display: block; margin-top: 8px; width: 100%; }

    .hint { font-size: 11px; margin: 6px 2px 0; opacity: 0.6; }

    .dest-actions,
    .json-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

    .saved { color: #2e7d32; font-size: 12px; }

    .error { color: #c62828; margin: 8px 2px 0; }

    .spacer { flex: 1; }
    .reset { opacity: 0.7; }
  `]
})
export class FlowsDialogComponent {
  private readonly store = inject(FlowStoreService);
  private readonly remote = inject(RemoteFlowService);
  private readonly dialog = inject(MatDialog);
  private readonly ref = inject(MatDialogRef<FlowsDialogComponent, FbFlowsAction>);

  flows: FbStoredFlow[] = this.store.list();
  currentId = this.store.currentId();

  name = '';
  url = '';

  /** The flow whose details are open, or null for the list. */
  details: FbStoredFlow | null = null;
  dest: 'local' | 'remote' = 'local';
  endpoint = '';
  token = '';
  hasToken = false;
  destSaved = false;
  detailsError: string | null = null;

  onOpen(flow: FbStoredFlow): void {
    this.ref.close({ kind: 'open', id: flow.id });
  }

  /** Open a flow's details: its destination (primed from what is stored) and JSON. */
  showDetails(flow: FbStoredFlow): void {
    this.details = flow;
    this.dest = flow.endpoint ? 'remote' : 'local';
    this.endpoint = flow.endpoint ?? '';
    this.hasToken = flow.endpoint ? this.remote.hasToken(flow.endpoint) : false;
    this.token = '';
    this.destSaved = false;
    this.detailsError = null;
  }

  /** Persist the destination (and any token) — shelf metadata, not the flow. */
  applyDestination(): void {
    if (!this.details) {
      return;
    }

    if (this.dest === 'remote') {
      const url = this.endpoint.trim();

      this.store.setDestination(this.details.id, url);

      if (this.token) {
        this.remote.setToken(url, this.token);
        this.hasToken = true;
        this.token = '';
      }
    } else {
      this.store.setDestination(this.details.id, null);
    }

    this.flows = this.store.list();
    this.details = this.flows.find(f => f.id === this.details!.id) ?? null;
    this.destSaved = true;
  }

  downloadJson(): void {
    if (!this.details) {
      return;
    }

    const flow = this.store.load(this.details.id);

    if (!flow) {
      this.detailsError = 'This flow has no saved copy to download.';

      return;
    }

    const json = serializeFlowToJson(flow);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');

    link.href = url;
    link.download = `${(this.details.title || 'flow').replace(/[^\w.-]+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Open the JSON in Monaco; a saved edit replaces this flow's content. */
  editJson(): void {
    if (!this.details) {
      return;
    }

    const flow = this.store.load(this.details.id);
    const id = this.details.id;

    this.dialog.open(JsonEditorDialogComponent, {
      maxWidth: '90vw',
      data: {
        title: this.details.title,
        json: flow ? serializeFlowToJson(flow) : '',
      } as FbJsonEditorData,
    }).afterClosed().subscribe((json?: string) => {
      if (json) {
        this.ref.close({ kind: 'replace', id, json });
      }
    });
  }

  onReplaceFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !this.details) {
      return;
    }

    const id = this.details.id;

    // Read here; the app validates it (a bad file becomes a load error there).
    void file.text().then(text => this.ref.close({ kind: 'replace', id, json: text }));
    input.value = '';
  }

  /** The name form: a new, blank flow on this device. */
  onNew(event: Event): void {
    event.preventDefault();

    if (this.name.trim()) {
      this.ref.close({ kind: 'new', title: this.name.trim() });
    }
  }

  onLoadUrl(event: Event): void {
    event.preventDefault();

    if (this.url.trim()) {
      this.ref.close({ kind: 'load', url: this.url.trim() });
    }
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      this.ref.close({ kind: 'file', file });
    }
  }

  onDelete(flow: FbStoredFlow): void {
    // Delete destroys the saved copy AND any unsaved draft, from one tap sitting
    // ~6px from the settings gear. Confirm when there is unsaved work to lose —
    // a mis-tap should not be able to take edits with it.
    if (this.store.hasDraft(flow.id)
      && !confirm(`“${flow.title}” has unsaved changes. Delete it and lose them?`)) {
      return;
    }

    this.store.remove(flow.id);
    this.flows = this.store.list();
  }

  /**
   * Wipe the local flows and reload onto the shipped default.
   *
   * Confirmed first: this throws away anything made here, not only old seeds. A
   * reload is the simplest way to a clean start — boot does the rest.
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
