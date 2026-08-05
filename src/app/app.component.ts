import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostBinding, HostListener, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TypeColorsComponent } from './components/type-colors/type-colors.component';
import { ModulesDialogComponent } from './components/modules/modules-dialog.component';
import { ModulesService } from './modules.service';
import { APP_VERSION } from './version';
import { FlowStoreService } from './flow-store.service';
import { FbFlowsAction, FlowsDialogComponent } from './components/flows/flows-dialog.component';
import {
  FbHistoryService,
  FbNodeState,
  FbPropagationReport,
  FlowBasedService,
  deserializeFlowFromJson,
  serializeFlowToJson,
} from '@scaljeri/flow-based';
import * as data from './fixtures';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentSelectionService } from './component-selection.service';

/*
 * The KEY_PRESS = { ESC: 27 } map is gone: `keyCode` has been deprecated for
 * years and the Escape handler binds `keydown.escape` declaratively instead.
 */

@Component({
  standalone: false,
  selector: 'fb-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  private selectionService = inject(ComponentSelectionService);
  private flowService = inject(FlowBasedService);
  history = inject(FbHistoryService);
  private overlay = inject(Overlay);
  private dialog = inject(MatDialog);
  private modules = inject(ModulesService);
  private store = inject(FlowStoreService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  activeOverlay: OverlayRef | null = null;
  readonly version = APP_VERSION;
  showJson = false;
  showDoc = false;
  flow: FbNodeState = data.basic as FbNodeState;
  loadError: string | null = null;

  /**
   * Embed mode: the article alone, with the app's chrome gone.
   *
   * `?embed=doc` is what the share button hands out, made for an <iframe> on
   * someone else's page — a toolbar with Add/undo/JSON inside a quote of the
   * document would be another product's cockpit in the middle of their text.
   * The canvas still runs underneath, hidden: the figures are its workers'
   * live output.
   */
  @HostBinding('class.is-embed')
  readonly embed = new URLSearchParams(window.location.search).has('embed');

  /**
   * Whether the document has ever been on screen.
   *
   * Embedded, the canvas has to stay hidden until it has — that is what keeps
   * the editor from flashing past while KaTeX downloads. But it may not stay
   * hidden forever: the document itself offers a button to the flow, and in
   * embed mode there is no toolbar to offer one instead.
   */
  private docOpened = false;

  /** Whether the flow may be shown at all — see docOpened. */
  get flowHidden(): boolean {
    return this.showJson || this.showDoc || (this.embed && !this.docOpened);
  }

  /** Flipped briefly after a copy, so the share button can say it worked. */
  shareCopied = false;

  /**
   * Whether the document is being written rather than read.
   *
   * The document element owns the draft; this only says which mode it is in,
   * because the buttons that drive it live in the toolbar rather than in the
   * page. A document that was never authored still edits: the element starts
   * from the one derived from the graph, which is how a document begins.
   */
  editingDoc = false;

  @ViewChild('docView') docView?: ElementRef<HTMLElement & { save(): void; cancel(): void }>;

  editDoc(): void {
    this.editingDoc = true;
  }

  saveDoc(): void {
    this.docView?.nativeElement.save();
    this.editingDoc = false;
  }

  cancelDoc(): void {
    this.docView?.nativeElement.cancel();
    this.editingDoc = false;
  }

  /** The document wrote itself into the flow; put that on the shelf. */
  persistNow(): void {
    this.persist();
  }

  /**
   * How the document view typesets TeX. Set the first time the view opens —
   * KaTeX arrives by dynamic import, so flows without formulas never download
   * it. MathML output on purpose: it is the browser's own maths rendering and
   * needs no stylesheet, so the document element's shadow root needs nothing
   * adopted into it (the same trick as the math module's panels).
   */
  mathRenderer?: (tex: string, display: boolean) => string;

  /** The live editor, for the document view's figures. */
  get editor() {
    return this.flowService.editor;
  }

  openModules(): void {
    this.dialog.open(ModulesDialogComponent, { width: '340px' });
  }

  openTypeColors(): void {
    this.dialog.open(TypeColorsComponent, { width: '320px' });
  }

  ngOnInit(): void {
    // For the e2e harness, which enables modules without walking the dialog.
    (window as unknown as { fbModules: ModulesService }).fbModules = this.modules;

    // Embedded, the document IS the page: open it before the flow even loads,
    // so the iframe never flashes the editor first.
    if (this.embed) {
      void this.toggleDoc();
    }

    void this.restoreFlow();

    this.selectionService.selection$.subscribe(type => {
      /*
       * Clear the handle as well as disposing. The backdropClick path nulls it
       * but this one did not, so a later Escape took the `else if
       * (this.activeOverlay)` branch and disposed an already-disposed ref instead
       * of firing triggerEvent('blur').
       */
      this.activeOverlay?.dispose();
      this.activeOverlay = null;

      this.flowService.add(type);
    });

    // The palette's own close button: same cleanup, nothing added.
    this.selectionService.close$.subscribe(() => {
      this.activeOverlay?.dispose();
      this.activeOverlay = null;
    });
  }

  /* ----------------------------------------------------------------------
     Undo / redo
     ----------------------------------------------------------------------
     Reassigning `flow` is all that is needed: FlowBasedComponent.ngOnChanges is
     gated on the `state` input, and the history service hands back a fresh
     object, so the graph is rebuilt from the snapshot.
   */

  undo(): void {
    const restored = this.history.undo(this.flow);

    if (restored) {
      this.flow = restored;
    }
  }

  redo(): void {
    const restored = this.history.redo(this.flow);

    if (restored) {
      this.flow = restored;
    }
  }

  @HostListener('document:keydown.control.z', ['$event'])
  @HostListener('document:keydown.meta.z', ['$event'])
  onUndoKey(event: Event): void {
    event.preventDefault();
    this.undo();
  }

  @HostListener('document:keydown.control.shift.z', ['$event'])
  @HostListener('document:keydown.meta.shift.z', ['$event'])
  onRedoKey(event: Event): void {
    event.preventDefault();
    this.redo();
  }

  /* ----------------------------------------------------------------------
     Flows in localStorage
     ----------------------------------------------------------------------
     The flow on screen is written back on every real change, so a reload
     costs nothing. The dialog lists what is stored; switching and creating
     go through `flow =` reassignment, which is all a graph swap ever needs.
   */

  private currentFlowId: string | null = null;
  private saveTimer?: ReturnType<typeof setTimeout>;

  /** The seeded demo's fixed id: one shared flow Luca and the tests both know. */
  private static readonly DEMO_ID = 'demo-seed';

  private async restoreFlow(): Promise<void> {
    /*
     * Modules FIRST, flow second. A saved flow can speak module types, and
     * showing it before those download rendered every module node as an empty
     * circle until something forced a re-render.
     */
    await this.modules.restore();

    /*
     * The demo lives in the store under a FIXED id, seeded from the fixture
     * whenever it is absent OR outdated — so a browser that has flows of its
     * own still gets it in the Flows dialog, deleting it there resets it,
     * and shipping a new fixture reaches every browser on its next visit.
     * One shared, reproducible flow to test on; edits to it do not survive a
     * fixture bump, which is the point of a shared reference.
     */
    const seeded = this.store.load(AppComponent.DEMO_ID);
    const fixture = data.demo() as FbNodeState & { config?: { seedVersion?: number } };

    if (!seeded || (seeded as { config?: { seedVersion?: number } }).config?.seedVersion !== fixture.config?.seedVersion) {
      this.store.save(AppComponent.DEMO_ID, fixture);
    }

    const id = this.store.currentId();
    const saved = id ? this.store.load(id) : null;

    if (id && saved) {
      this.zone.run(() => {
        this.currentFlowId = id;
        this.flow = saved;
        this.cdr.detectChanges();
      });

      return;
    }

    /*
     * A fresh browser gets the demo — and the demo speaks math and graphs, so
     * those modules download first. The await matters: loading a flow whose
     * types are not registered yet would draw dead boxes.
     */
    await Promise.all([this.modules.enable('math'), this.modules.enable('graphs')]);

    /*
     * Back INSIDE the zone — zone.js does not patch dynamic import(), and the
     * module downloads above are exactly that — and then an explicit tick:
     * measured here, re-entering the zone alone did not schedule one, so the
     * demo was saved and never shown until the next unrelated click.
     */
    this.zone.run(() => {
      this.flow = this.store.load(AppComponent.DEMO_ID) ?? (data.demo() as FbNodeState);
      this.currentFlowId = AppComponent.DEMO_ID;
      this.store.setCurrent(AppComponent.DEMO_ID);
      this.cdr.detectChanges();
    });
  }

  /**
   * After the view, not in ngOnInit: the editor is built by a CHILD component,
   * which does not exist yet while the parent initialises — a subscription
   * taken there was a subscription on undefined, and nothing ever saved.
   */
  ngAfterViewInit(): void {
    this.startAutosave();
  }

  private startAutosave(): void {
    this.flowService.editor?.changes.subscribe(change => {
      // The graph, not the gestures: a pointer trail or a selection is not
      // worth a serialisation, and 'history' fires on every capture.
      if (change.kind === 'pointer' || change.kind === 'interaction'
        || change.kind === 'selection' || change.kind === 'viewport'
        || change.kind === 'history') {
        return;
      }

      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.persist(), 600);
    });
  }

  private persist(): void {
    if (!this.currentFlowId) {
      return;
    }

    this.store.save(this.currentFlowId, this.flow);
    this.store.setCurrent(this.currentFlowId);
  }

  openFlows(): void {
    // Written first, so the list the dialog shows includes the newest state.
    this.persist();

    this.dialog.open(FlowsDialogComponent, { width: '360px' })
      .afterClosed().subscribe((action?: FbFlowsAction) => {
        if (!action) {
          return;
        }

        if (action.kind === 'open') {
          const flow = this.store.load(action.id);

          if (flow) {
            this.currentFlowId = action.id;
            this.store.setCurrent(action.id);
            this.history.clear();
            this.flow = flow;
          }
        } else {
          const flow: FbNodeState = {
            type: 'flow', title: action.title, sockets: [], children: [], connections: [],
          } as FbNodeState;

          this.history.clear();
          this.flow = flow;
          this.currentFlowId = this.store.create(flow);
        }

        this.cdr.detectChanges();
      });
  }

  /* ----------------------------------------------------------------------
     Save / load
     ---------------------------------------------------------------------- */

  save(): void {
    const json = serializeFlowToJson(this.flow);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');

    link.href = url;
    link.download = 'flow.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  async onLoad(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const restored = deserializeFlowFromJson(await file.text());

      this.history.capture(this.flow);
      this.flow = restored;
      this.loadError = null;
    } catch (err) {
      // Surfaced in the toolbar rather than only in the console.
      this.loadError = (err as Error).message;
    } finally {
      // Allow re-selecting the same file.
      input.value = '';
    }
  }

  /* ----------------------------------------------------------------------
     Validation
     ----------------------------------------------------------------------
     Flow.lastPropagation exists so problems can be shown in the UI instead of
     being whispered to the console, which is what the old fixpoint loop did.
   */

  get validation(): FbPropagationReport | null {
    // A signal, so the badge appears when the engine finds a problem rather than
    // when the user next clicks something.
    return this.flowService.propagation();
  }

  get problemCount(): number {
    const report = this.validation;

    if (!report) {
      return 0;
    }

    return report.unresolvedSocketIds.length + report.cycles.length + (report.converged ? 0 : 1);
  }

  get validationDetail(): string {
    const report = this.validation;

    if (!report) {
      return '';
    }

    const parts: string[] = [];

    if (!report.converged) {
      parts.push('socket formats did not settle');
    }

    if (report.unresolvedSocketIds.length) {
      parts.push(`${report.unresolvedSocketIds.length} socket(s) without a format`);
    }

    if (report.cycles.length) {
      parts.push(`${report.cycles.length} cycle(s): ${report.cycles.map(c => c.join(' → ')).join(', ')}`);
    }

    return parts.join('; ');
  }

  openModal(): void {
    const portal = new ComponentPortal(ComponentSelectionComponent);
    const positionStrategy = this.overlay.position()
      .global()
      .centerHorizontally()
      .centerVertically();

    this.activeOverlay = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'dark-backdrop',
      panelClass: 'comp-selection',
      height: '600px',
      width: '400px',
      positionStrategy
    });

    this.activeOverlay.attach(portal);

    this.activeOverlay.backdropClick().subscribe(() => {
      this.activeOverlay!.dispose();
      this.activeOverlay = null;
    });
  }

  showJSON(): void {
    this.showJson = !this.showJson;
    this.showDoc = false;
  }

  /**
   * The same flow, read as a document.
   *
   * The canvas stays in the DOM, merely hidden: destroying it would destroy the
   * editor and its workers, and the document's figures are those workers' live
   * output — a document over a dead flow would show empty plots.
   */
  async toggleDoc(): Promise<void> {
    if (!this.showDoc && !this.mathRenderer) {
      const { default: katex } = await import('katex');

      this.mathRenderer = (tex, display) =>
        katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'mathml' });
    }

    this.showDoc = !this.showDoc;
    this.showJson = false;
    this.docOpened = this.docOpened || this.showDoc;

    // Closing the page abandons an edit rather than hiding one: coming back to
    // a document that is silently half-rewritten is worse than losing a draft.
    if (!this.showDoc) {
      this.editingDoc = false;
    }
    // zone.js does not patch dynamic import(); after the await we are outside
    // the zone and nothing schedules a tick (see restoreFlow).
    this.cdr.detectChanges();
  }

  /**
   * Something the document asked for.
   *
   * A document names an action and the host decides what it means; this app
   * knows one, and a name it does not know is simply ignored rather than
   * guessed at.
   */
  onDocAction(event: Event): void {
    const action = (event as CustomEvent<{ action?: string }>).detail?.action;

    if (action === 'flow') {
      this.showDoc = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * The share button: an URL that renders the article alone.
   *
   * A plain link rather than an <iframe> snippet on purpose — a link works
   * pasted anywhere (chat, mail, address bar) AND dropped into an iframe's
   * src, while markup only works in the one place that accepts markup.
   */
  async copyShareLink(): Promise<void> {
    const url = `${location.origin}${location.pathname}?embed=doc`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard permission (or no secure context): show the URL instead,
      // which is clunky but never silently does nothing.
      window.prompt('Copy this embed link', url);

      return;
    }

    this.shareCopied = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.shareCopied = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  get flowJson(): string {
    return serializeFlowToJson(this.flow);
  }

  @HostListener('document:keydown.escape')
  escape(): void {
    // Embedded there is nothing to go back TO: closing the document would
    // reveal the editor this mode exists to hide.
    if (this.embed) {
      return;
    }

    if (this.showJson) {
      this.showJson = false;
    } else if (this.showDoc) {
      this.showDoc = false;
    } else if (this.activeOverlay) {
      this.activeOverlay.dispose();

      this.activeOverlay = null;
    } else {
      this.flowService.triggerEvent('blur');
    }
  }
}
