import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Host, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { CustomCodeWorker } from '../../workers/custom-code';
import { FB_SOCKET_COLORS, FbNodeState } from '../../../../projects/flow-based/src/lib/flow-based';
import { Editor, EditorChangeLinkedList } from 'codemirror';
import { FormControl } from '@angular/forms';

declare var require: any;
const CodeMirror = require('codemirror');

@Component({
  selector: 'fb-custom-code',
  templateUrl: './custom-code.component.html',
  styleUrls: ['./custom-code.component.scss']
})
export class CustomCodeComponent implements OnInit, AfterViewInit {
  private worker: CustomCodeWorker;
  private state: FbNodeState;
  public error: boolean;
  private editor: any;

  inputFormatControl = new FormControl();
  outputFormatControl = new FormControl();

  @ViewChild('code') codeRef: ElementRef;

  constructor(@Host() private service: NodeService,
              @Inject(FB_SOCKET_COLORS) private colors: Record<string, string>,
              private _ngZone: NgZone,
              private cdr: ChangeDetectorRef) {
    this.state = service.state;
  }

  ngOnInit() {
    this.worker = this.service.worker as CustomCodeWorker;

    this.inputFormatControl.valueChanges.subscribe((format: string) => {
      this.state.sockets![0].format = format;
    });

    this.outputFormatControl.valueChanges.subscribe((format: string) => {
      this.state.sockets![1].format = format;
    });

    this.inputFormatControl.setValue(this.state.sockets![0].format);
    this.outputFormatControl.setValue(this.state.sockets![1].format);
  }

  ngAfterViewInit(): void {
  }

  get func(): string {
    return this.state.config.func;
  }

  set func(str: string) {
    this.state.config.func = str;
    this.error = false;

    try {
      this.worker.compileFunction(str);
    } catch (err) {
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

  onKeyDown(): void {
    console.log(this.func);
  }

   onActive(isActive): void {
    // this._ngZone.runOutsideAngular(() => {
      if (!this.editor) {
        this.editor = CodeMirror(this.codeRef.nativeElement, {
          lineNumbers: true,
          theme: 'material',
          mode: 'javascript',
          value: this.state.config.func
        });

        this.editor.on(
          'change',
          (cm: Editor, change: EditorChangeLinkedList) => {
            this.worker.compileFunction(cm.getValue());
            this.cdr.detectChanges();
            // this._ngZone.run(() => this.codemirrorValueChanged(cm, change)),
          }
        );
      }
    // });
  }

  get types(): string[] {
    return Object.keys(this.colors);
  }
}
