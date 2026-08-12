import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { deserializeFlowFromJson, serializeFlowToJson } from '@scaljeri/flow-based';
import { monaco } from '@scaljeri/flow-based-basics';

/** What the editor opens on, and hands back: a flow's JSON as text. */
export interface FbJsonEditorData {
  title: string;
  json: string;
  /** Read-only when the caller only wants to show the JSON, not change it. */
  readonly?: boolean;
}

/**
 * A flow's JSON, in Monaco, editable.
 *
 * The same editor the script node uses (one shared download — see basics'
 * `monaco`), so viewing or hand-editing a flow costs no second megabyte. Save is
 * gated on the text parsing as a flow: an unparseable edit is refused with the
 * reason, rather than written and discovered broken on the next open. Returns
 * the RE-serialised JSON (so the stored form is normalised), or nothing on
 * cancel.
 */
@Component({
  standalone: false,
  selector: 'fb-json-editor-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.readonly ? 'Flow JSON' : 'Edit JSON' }} — {{ data.title }}</h2>

    <mat-dialog-content>
      <div #host class="editor"></div>
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions>
      <span class="spacer"></span>
      <button type="button" mat-button mat-dialog-close>{{ data.readonly ? 'Close' : 'Cancel' }}</button>
      @if (!data.readonly) {
        <button type="button" mat-flat-button color="primary" (click)="save()">Save</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      min-width: min(80vw, 720px);
    }

    .editor {
      height: min(60vh, 520px);
      width: 100%;
      border: 1px solid rgba(127, 127, 127, 0.4);
      border-radius: 6px;
      overflow: hidden;
    }

    .error {
      color: #c62828;
      margin: 10px 2px 0;
      white-space: pre-wrap;
    }

    .spacer {
      flex: 1;
    }
  `]
})
export class JsonEditorDialogComponent implements AfterViewInit, OnDestroy {
  readonly data = inject<FbJsonEditorData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<JsonEditorDialogComponent, string>);

  @ViewChild('host') private host?: ElementRef<HTMLElement>;

  error: string | null = null;
  private editor?: { getValue(): string; dispose(): void; layout(): void };
  private observer?: ResizeObserver;
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    const host = this.host?.nativeElement;

    if (!host) {
      return;
    }

    const api = await monaco();

    if (this.destroyed) {
      return;   // dialog closed while Monaco was in the air
    }

    const editor = api.editor.create(host, {
      value: this.data.json,
      language: 'json',
      theme: 'vs-dark',
      readOnly: !!this.data.readonly,
      automaticLayout: false,
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      tabSize: 2,
    });

    this.editor = editor;

    // Monaco measures its container once; the dialog can grow (a viewport turn),
    // so one observer relays that instead of a polling layout loop.
    this.observer = new ResizeObserver(() => this.editor?.layout());
    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.editor?.dispose();
  }

  /**
   * Accept the edit only if it parses as a flow. Re-serialising normalises it to
   * exactly the stored form (and proves the round-trip), so what lands on the
   * shelf is what every other save writes.
   */
  save(): void {
    const text = this.editor?.getValue() ?? this.data.json;

    try {
      const flow = deserializeFlowFromJson(text);

      this.ref.close(serializeFlowToJson(flow));
    } catch (err) {
      this.error = `Not a valid flow — ${(err as Error).message}`;
    }
  }
}
