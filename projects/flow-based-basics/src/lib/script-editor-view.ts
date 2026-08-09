import {
  AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject,
} from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { ScriptWorker } from './script.worker';
import { monaco } from './monaco';

/**
 * The script itself, in a real editor.
 *
 * Monaco rather than a textarea because this is the one node whose content is
 * code, and code in a textarea is code you write somewhere else and paste in.
 * It arrives by dynamic import: several megabytes that a flow with no script
 * in it should not pay for.
 *
 * Everything below the header opts out of dragging. A node is moved by
 * pressing it, and that is the same press that puts a cursor in the fourth
 * line of a function.
 */
/**
 * What both open views of a script node do; they differ only in how much room
 * they have. Abstract and undeclared: it has no selector, so it is never
 * mounted itself.
 */
@Directive()
export abstract class ScriptEditorView implements OnInit, AfterViewInit, OnDestroy {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('host') host?: ElementRef<HTMLElement>;

  worker?: ScriptWorker;

  private subscription?: Subscription;
  private editor?: { dispose(): void; getValue(): string; layout(): void };
  private observer?: ResizeObserver;
  private destroyed = false;

  ngOnInit(): void {
    this.worker = this.service.worker as ScriptWorker | undefined;
    this.subscription = this.worker?.changes.subscribe(() => this.cdr.detectChanges());
  }

  async ngAfterViewInit(): Promise<void> {
    const host = this.host?.nativeElement;

    if (!host) {
      return;
    }

    const api = await monaco();

    // Gone while the editor was in the air, which stepping the view does.
    if (this.destroyed) {
      return;
    }

    const editor = api.editor.create(host, {
      value: this.worker?.source ?? '',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: false,
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      tabSize: 2,
    });

    /*
     * Compiled on every keystroke. A syntax error is worth seeing while it is
     * being made rather than when the next value happens to arrive — and the
     * worker keeps the last function that compiled, so a running flow does not
     * stop because a brace is missing for a second.
     */
    editor.onDidChangeModelContent(() => {
      this.worker?.setSource(editor.getValue());
      this.cdr.detectChanges();
    });

    this.editor = editor;

    /*
     * Monaco measures its container once. `automaticLayout` would do this for
     * us with a polling loop of its own; the node already has a size that
     * changes for reasons the shell knows about, so one observer is cheaper
     * and never runs when nothing moved.
     */
    this.observer = new ResizeObserver(() => this.editor?.layout());
    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscription?.unsubscribe();
    this.observer?.disconnect();
    this.editor?.dispose();
  }

  get problem(): string | null {
    return this.worker?.compileError ?? this.worker?.runtimeError ?? null;
  }
}
