import { AfterViewInit, Directive, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { CustomCodeView } from './custom-code-view';

/**
 * The open node: format pickers and the CodeMirror editor.
 *
 * Normal and full share all of it and differ only in how much room the host
 * gives the editor. Mounted per view by the shell, so the editor is created in
 * ngAfterViewInit — there is no longer an onActive moment to wait for.
 */
@Directive()
export abstract class CustomCodeEditor extends CustomCodeView implements AfterViewInit, OnDestroy {
  @ViewChild('code') codeRef!: ElementRef<HTMLElement>;

  inputFormatControl = new FormControl<string | null>(null);
  outputFormatControl = new FormControl<string | null>(null);

  private editor?: EditorView;

  /** The demo's socket palette, for the format autocompletes. */
  abstract get types(): string[];

  override ngOnInit(): void {
    super.ngOnInit();

    this.inputFormatControl.valueChanges.subscribe(format => {
      this.state.sockets![0].format = format;
    });

    this.outputFormatControl.valueChanges.subscribe(format => {
      this.state.sockets![1].format = format;
    });

    this.inputFormatControl.setValue(this.state.sockets![0].format ?? null);
    this.outputFormatControl.setValue(this.state.sockets![1].format ?? null);
  }

  ngAfterViewInit(): void {
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

            this.func = update.state.doc.toString();
            this.cdr.detectChanges();
          }),
        ],
      }),
    });
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  /** Persists to the state AND compiles, so the JSON always holds the source. */
  set func(str: string) {
    this.state.config.func = str;

    try {
      this.worker.compileFunction(str);
    } catch {
      // compileError on the worker carries the status; nothing extra to keep.
    }
  }
}
