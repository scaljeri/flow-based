import { ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FB_SOCKET_COLORS, FbNodeState, NodeService } from '@scaljeri/flow-based';
import { CustomCodeWorker } from '../../workers/custom-code';
import { FormControl } from '@angular/forms';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

/*
 * Migrated from CodeMirror 5 (via @ctrl/ngx-codemirror) to CodeMirror 6.
 *
 * CM5 was a single callable module — `const CodeMirror = require('codemirror')`
 * — configured with an options object, and languages/themes were registered by
 * importing side-effecting files. CM6 is a set of small ESM packages composed
 * through `extensions`, needs no Angular wrapper, and ships no CSS files to link
 * (themes are extensions, so the two `codemirror/*.css` entries in angular.json
 * are gone).
 */
@Component({
  standalone: false,
  selector: 'fb-custom-code',
  templateUrl: './custom-code.component.html',
  styleUrls: ['./custom-code.component.scss']
})
export class CustomCodeComponent implements OnInit, OnDestroy {
  private worker!: CustomCodeWorker;
  private state: FbNodeState;
  public error = false;
  private editor?: EditorView;

  inputFormatControl = new FormControl<string | null>(null);
  outputFormatControl = new FormControl<string | null>(null);

  @ViewChild('code') codeRef!: ElementRef<HTMLElement>;

  constructor(private service: NodeService,
              @Inject(FB_SOCKET_COLORS) private colors: Record<string, string>,
              private cdr: ChangeDetectorRef) {
    this.state = service.state;
  }

  ngOnInit(): void {
    this.worker = this.service.worker as CustomCodeWorker;

    this.inputFormatControl.valueChanges.subscribe(format => {
      this.state.sockets![0].format = format;
    });

    this.outputFormatControl.valueChanges.subscribe(format => {
      this.state.sockets![1].format = format;
    });

    this.inputFormatControl.setValue(this.state.sockets![0].format ?? null);
    this.outputFormatControl.setValue(this.state.sockets![1].format ?? null);
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  get func(): string {
    return this.state.config.func;
  }

  set func(str: string) {
    this.state.config.func = str;
    this.error = false;

    try {
      this.worker.compileFunction(str);
    } catch {
      this.error = true;
    }
  }

  get title(): string {
    return this.state.title!;
  }

  get hasRuntimeError(): boolean {
    return !!this.worker.runtimeError;
  }

  get hasCompileError(): boolean {
    return !!this.worker.compileError;
  }

  onActive(): void {
    if (this.editor) {
      return;
    }

    this.editor = new EditorView({
      parent: this.codeRef.nativeElement,
      state: EditorState.create({
        doc: this.state.config.func ?? '',
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          javascript(),
          oneDark,
          EditorView.updateListener.of(update => {
            if (!update.docChanged) {
              return;
            }

            /*
             * Assign through the `func` setter, which persists to
             * state.config.func as well as compiling. The CM5 version called
             * worker.compileFunction() directly and never wrote back, so the
             * setter was dead code and edited source was silently missing from
             * the exported flow JSON.
             */
            this.func = update.state.doc.toString();
            this.cdr.detectChanges();
          }),
        ],
      }),
    });
  }

  get types(): string[] {
    return Object.keys(this.colors);
  }
}
