import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  signal,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FbAlignment, FbNodeState, FbSocketColors } from '@scaljeri/flow-based-core';
// Imported for the side effect as well as the types: this registers
// <fb-flow-canvas> and friends with the custom-element registry.
import { FbEditor, FbFlowCanvasElement } from '@scaljeri/flow-based-lit';
import { FB_NODE_HELPERS, FB_NODE_TYPES, FB_SOCKET_COLORS, FbNodeHelpers, FbNodeTypes } from './flow-based';
import { FlowBasedService } from './flow-based.service';
import { FbHistoryService } from './utils/history.service';
import { angularNodeTypes } from './angular-node';

/**
 * The Angular editor — a wrapper around the web-component shell.
 *
 * There used to be two editors in this repo: an Angular one and a Lit one, both
 * drawing nodes, dragging them and routing connections. Two implementations of
 * the same thing do not stay the same; the socket geometry had already drifted
 * by 3px between them. This is now the only implementation, with Angular
 * supplying what a web component cannot do for itself — creating Angular
 * components for node content, and being injectable.
 *
 * What it replaces is worth stating plainly: NodeComponent, SocketComponent,
 * ConnectionLinesComponent, three drag-and-drop directives, a dynamic-component
 * directive and four services. About 1,200 lines, all of it a second copy.
 */
@Component({
  selector: 'fb-flow-based',
  template: `<fb-flow-canvas #canvas [editor]="editor"></fb-flow-canvas>`,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    fb-flow-canvas {
      display: block;
      height: 100%;
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FlowBasedComponent implements OnChanges, OnDestroy {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type!: string;
  @Input() state!: FbNodeState;

  @Output() stateChanged = new EventEmitter<boolean>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<FbFlowCanvasElement>;

  /**
   * Built in the constructor rather than in ngOnInit, so it is never undefined.
   *
   * Angular applies property bindings AFTER inserting an element, so a custom
   * element's connectedCallback can run before `editor` is set. The shell copes
   * with that, but there is no reason to rely on it.
   */
  readonly editor: FbEditor;

  /**
   * The zoom level, as a signal, for a host app's toolbar to bind to.
   *
   * The shell notifies through a plain emitter — it has no idea what Angular is —
   * so this is the one place that translation has to happen. A template reading a
   * signal is marked dirty when it changes, which is all the wiring there is.
   */
  readonly zoomPercent = signal(100);

  /** How many nodes are selected, for a toolbar to show or hide itself. */
  readonly selectionCount = signal(0);

  private readonly unsubscribe: () => void;

  constructor(
    private readonly flowService: FlowBasedService,
    environmentInjector: EnvironmentInjector,
    history: FbHistoryService,
    @Inject(FB_NODE_TYPES) types: FbNodeTypes,
    @Optional() @Inject(FB_NODE_HELPERS) helpers: FbNodeHelpers,
    @Optional() @Inject(FB_SOCKET_COLORS) socketColors: FbSocketColors) {

    this.editor = new FbEditor({
      types: angularNodeTypes(types, environmentInjector),
      helpers: helpers ?? undefined,
      socketColors: socketColors ?? undefined,
      /*
       * The app's undo stack, not a second one. FbHistoryService is what a
       * template binds its undo button to; if the editor pushed to a private
       * stack the button would disagree with the editor about what happened.
       */
      history: history.core,
    });

    this.unsubscribe = this.editor.changes.subscribe(change => {
      if (change.kind === 'viewport') {
        this.zoomPercent.set(this.editor.viewport.zoomPercent());
      }

      if (change.kind === 'selection' || change.kind === 'structure') {
        this.selectionCount.set(this.editor.selection.size);
      }
    });

    this.flowService.activate(this.editor);
  }

  ngOnChanges(changes: SimpleChanges): void {
    /*
     * Gated on `state`. This used to fire for ANY input change — including
     * `active` and `type` — rebuilding the whole graph and silently discarding
     * the previous Flow's workers without destroying them (docs/AUDIT.md §3.2).
     */
    if (changes['state'] && this.state) {
      this.editor.load(this.state);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe();
    this.flowService.deactivate(this.editor);
  }

  /* ----------------------------------------------------------------------
     Viewport — delegated, so a host app's toolbar has something to call
     ---------------------------------------------------------------------- */

  zoomIn(): void {
    this.canvasRef.nativeElement.zoomIn();
  }

  zoomOut(): void {
    this.canvasRef.nativeElement.zoomOut();
  }

  resetView(): void {
    this.canvasRef.nativeElement.resetView();
  }

  /* ----------------------------------------------------------------------
     Selection — delegated for the same reason as the viewport
     ---------------------------------------------------------------------- */

  selectAll(): void {
    this.editor.selectAll();
  }

  clearSelection(): void {
    this.editor.clearSelection();
  }

  removeSelection(): void {
    this.editor.removeSelection();
  }

  copySelection(): void {
    this.editor.copySelection();
  }

  paste(): void {
    this.editor.paste();
  }

  duplicateSelection(): void {
    this.editor.duplicateSelection();
  }

  align(alignment: FbAlignment): void {
    this.editor.alignSelection(alignment);
  }

  distribute(axis: 'x' | 'y'): void {
    this.editor.distributeSelection(axis);
  }

  get id(): number {
    return this.state.id!;
  }
}
