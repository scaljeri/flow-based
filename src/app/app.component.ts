import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostBinding, HostListener, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TypeColorsComponent } from './components/type-colors/type-colors.component';
import { SocketTypesDialogComponent } from './components/socket-types/socket-types-dialog.component';
import { ModulesDialogComponent } from './components/modules/modules-dialog.component';
import { ModulesService } from './modules.service';
import { APP_VERSION } from './version';
import { FlowStoreService } from './flow-store.service';
import { FbFlowsAction, FbFlowsData, FlowsDialogComponent } from './components/flows/flows-dialog.component';
import {
  FbHistoryService,
  FbNodeState,
  FbPropagationReport,
  FlowBasedService,
  deserializeFlowFromJson,
  serializeFlowToJson,
} from '@scaljeri/flow-based';
import { TriggerWorker } from '@scaljeri/flow-based-basics';
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
   * The flow on screen came from a URL: kept so the address bar can show it and
   * the share link can carry it, which is the whole point — a flow you cannot
   * point someone at is a flow you cannot share.
   */
  private currentSourceUrl: string | null = null;

  /**
   * A URL-loaded flow has no home on the shelf, so its changes cannot autosave
   * anywhere. `dirty` raises the Save button instead; it can only ever be true
   * while `currentFlowId` is null, because a flow with a home autosaves.
   */
  dirty = false;

  /**
   * The flow exactly as it was fetched, serialised. A programmatic load rebuilds
   * the graph and that rebuild emits change events — comparing against this
   * snapshot tells a real edit from the echo of loading, so the Save button
   * appears when the person changes something, not when the flow arrives.
   */
  private loadedJson: string | null = null;

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

  /** The book of socket types, open at a page or at the beginning. */
  openSocketTypes(format?: string): void {
    this.dialog.open(SocketTypesDialogComponent, { width: '480px', data: { format } });
  }

  /** The `i` on a pressed socket, asking what that socket carries. */
  onFormatInfo(event: Event): void {
    const format = (event as CustomEvent<{ format?: string }>).detail?.format;

    this.openSocketTypes(format);
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

  private async restoreFlow(): Promise<void> {
    /*
     * Modules FIRST, flow second. A saved flow can speak module types, and
     * showing it before those download rendered every module node as an empty
     * circle until something forced a re-render.
     */
    await this.modules.restore();

    /*
     * The two showcase articles are no longer bundled. They used to be seeded
     * here from `demo()` and `tno()` fixtures; they now ship as standalone flow
     * files under `assets/flows/` and are opened by LOADING them — a specific
     * case is a flow you load, not code in the app. Existing browsers keep any
     * copy they already seeded (this is not destructive of local work); a fresh
     * browser opens the small starter below.
     */

    /*
     * A link into the app can name a flow to open: `?flow=<url>`. It wins over
     * the stored "current" pointer — someone following a shared link means to
     * see that flow, not whatever this browser had open last. A local copy that
     * already mirrors the URL is preferred over re-fetching, so a reload does
     * not throw away edits the person saved (findBySourceUrl).
     */
    const fromUrl = new URLSearchParams(window.location.search).get('flow');

    if (fromUrl) {
      const localId = this.store.findBySourceUrl(fromUrl);
      const local = localId ? this.store.load(localId) : null;

      if (localId && local) {
        await this.modules.enableFor(local);
        this.zone.run(() => {
          this.currentFlowId = localId;
          this.currentSourceUrl = fromUrl;
          this.store.setCurrent(localId);
          this.flow = local;
          this.cdr.detectChanges();
        });

        return;
      }

      if (await this.loadFromUrl(fromUrl)) {
        return;
      }
      // The fetch failed; loadError is showing. Fall through to the usual flow
      // so the app still opens on something rather than a blank canvas.
    }

    const id = this.store.currentId();
    const saved = id ? this.store.load(id) : null;

    if (id && saved) {
      // The flow names its own types, and a type name names its module.
      await this.modules.enableFor(saved);

      this.zone.run(() => {
        this.currentFlowId = id;
        this.flow = saved;
        this.cdr.detectChanges();
      });

      return;
    }

    /*
     * A fresh browser opens the small starter. enableFor registers the modules
     * its types name (the plane is a graphs node) before it is drawn — a flow
     * shown before its types are registered draws dead boxes. Cloned, so the
     * editor mutates a copy rather than the shared import.
     */
    const starter = structuredClone(data.basic) as FbNodeState;

    await this.modules.enableFor(starter);

    /*
     * Back INSIDE the zone — zone.js does not patch dynamic import(), and the
     * module download above is exactly that — and then an explicit tick:
     * measured here, re-entering the zone alone did not schedule one, so the
     * flow was saved and never shown until the next unrelated click. `create`
     * makes it the current stored flow, so its edits autosave from the start.
     */
    this.zone.run(() => {
      this.flow = starter;
      this.currentFlowId = this.store.create(starter);
      this.cdr.detectChanges();
    });
  }

  /**
   * Fetch a flow from anywhere and show it — in memory, not on the shelf.
   *
   * A flow can come from any address, not only this site's, so the fetch is a
   * plain cross-origin request: the source must allow it (CORS), exactly as the
   * Request node's targets must. On failure the reason is surfaced rather than
   * swallowed. Modules are registered before the flow is drawn — the same rule
   * a file load follows — and enableFor's guard keeps an unseen module off.
   */
  async loadFromUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const restored = deserializeFlowFromJson(await response.text());

      await this.modules.enableFor(restored);

      this.zone.run(() => {
        this.history.clear();
        this.currentFlowId = null;        // in memory: it has no home yet
        this.currentSourceUrl = url;
        this.dirty = false;
        this.flow = restored;
        this.loadedJson = serializeFlowToJson(restored);
        this.loadError = null;
        this.reflectUrl();
        this.cdr.detectChanges();
      });

      return true;
    } catch (err) {
      this.zone.run(() => {
        this.loadError = `${url} — ${(err as Error).message}`;
        this.cdr.detectChanges();
      });

      return false;
    }
  }

  /**
   * Keep the address bar in step with where the flow came from.
   *
   * `?flow=<url>` when the flow has a source, gone when it does not, and
   * `embed` (or anything else already there) left untouched. replaceState, not
   * push: opening a flow is not a page the back button should have to walk.
   */
  private reflectUrl(): void {
    const params = new URLSearchParams(window.location.search);

    if (this.currentSourceUrl) {
      params.set('flow', this.currentSourceUrl);
    } else {
      params.delete('flow');
    }

    const query = params.toString();

    window.history.replaceState(null, '', `${location.pathname}${query ? '?' + query : ''}`);
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

      // A flow with a home autosaves. One without — loaded from a URL — has
      // nowhere to autosave to, so a genuine edit raises the Save button. The
      // content check is what stops the load's own rebuild from tripping it.
      if (this.currentFlowId) {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.persist(), 600);
      } else if (!this.dirty && this.loadedJson !== null
                 && serializeFlowToJson(this.flow) !== this.loadedJson) {
        this.zone.run(() => {
          this.dirty = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private persist(): void {
    if (!this.currentFlowId) {
      return;
    }

    // Which fetched modules this flow needs, written into the flow itself —
    // so it can be reopened in a browser that has never heard of them.
    this.modules.stamp(this.flow);
    this.store.save(this.currentFlowId, this.flow);
    this.store.setCurrent(this.currentFlowId);
  }

  openFlows(): void {
    // Written first, so the list the dialog shows includes the newest state.
    // A homeless flow has nowhere to write, so persist() no-ops — deliberate.
    this.persist();

    this.dialog.open(FlowsDialogComponent, { width: '360px' })
      .afterClosed().subscribe((action?: FbFlowsAction) => this.onFlowsAction(action));
  }

  /**
   * The Save button on a URL-loaded flow: it has no home, so where it lands is
   * not obvious — the Flows dialog asks. In save mode the name field is primed
   * and the answer is a `save` action.
   */
  saveToShelf(): void {
    this.dialog.open(FlowsDialogComponent, {
      width: '360px',
      data: { mode: 'save', title: this.flow.title } as FbFlowsData,
    }).afterClosed().subscribe((action?: FbFlowsAction) => this.onFlowsAction(action));
  }

  private onFlowsAction(action?: FbFlowsAction): void {
    if (!action) {
      return;
    }

    if (action.kind === 'open') {
      const flow = this.store.load(action.id);

      if (flow) {
        /*
         * Modules first, then the flow: a flow shown before its types are
         * registered draws every one of its nodes as an empty box, and
         * the engine gives them no workers at all.
         */
        void this.modules.enableFor(flow).then(() => this.zone.run(() => {
          this.currentFlowId = action.id;
          // A stored flow may remember where it came from — restore the link.
          this.currentSourceUrl = this.store.sourceUrlOf(action.id) ?? null;
          this.dirty = false;
          this.loadedJson = null;
          this.store.setCurrent(action.id);
          this.history.clear();
          this.flow = flow;
          this.reflectUrl();
          this.cdr.detectChanges();
        }));
      }

      return;
    }

    if (action.kind === 'load') {
      void this.loadFromUrl(action.url);

      return;
    }

    if (action.kind === 'save') {
      // The in-memory flow gets a home, under the name just chosen, and keeps
      // its source so its share link still points where it came from. It now
      // has an id, so from here it autosaves like any other.
      this.flow = { ...this.flow, title: action.title };
      this.currentFlowId = this.store.create(this.flow, this.currentSourceUrl ?? undefined);
      this.dirty = false;
      this.loadedJson = null;
      this.reflectUrl();
      this.cdr.detectChanges();

      return;
    }

    // 'new': an empty flow of its own, with no source.
    const flow: FbNodeState = {
      type: 'flow', title: action.title, sockets: [], children: [], connections: [],
    } as FbNodeState;

    this.history.clear();
    this.flow = flow;
    this.currentSourceUrl = null;
    this.dirty = false;
    this.loadedJson = null;
    this.currentFlowId = this.store.create(flow);
    this.reflectUrl();
    this.cdr.detectChanges();
  }

  /* ----------------------------------------------------------------------
     Save / load
     ---------------------------------------------------------------------- */

  save(): void {
    // The downloaded file is the one most likely to be opened somewhere else,
    // which is exactly where a module URL is not optional.
    this.modules.stamp(this.flow);

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

      /*
       * A file from somebody else speaks whatever modules they had. Fetching
       * them BEFORE the flow is shown is the same rule the stored flows
       * follow: a document drawn before its types are registered is a screen
       * of empty boxes with no workers behind them.
       */
      await this.modules.enableFor(restored);

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
   * A document names an action and the host decides what it means. This app
   * knows one of its own — `flow` leaves the article for the graph — and
   * hands every OTHER name into the graph: a trigger node whose `action`
   * matches fires, which is how a moment crosses from prose to wires. A name
   * nothing answers to is simply ignored rather than guessed at.
   */
  onDocAction(event: Event): void {
    const action = (event as CustomEvent<{ action?: string }>).detail?.action;

    if (!action) {
      return;
    }

    if (action === 'flow') {
      this.showDoc = false;
      this.cdr.detectChanges();

      return;
    }

    const editor = this.editor;

    if (!editor) {
      return;
    }

    // The whole tree, not just the top level: a trigger inside a subflow
    // still answers — machinery is often foldered away exactly there.
    const fire = (node: FbNodeState): void => {
      if (node.type === 'trigger' && (node.config as { action?: string } | undefined)?.action === action) {
        (editor.flow.getWorker(node.id!) as TriggerWorker | undefined)?.fire();
      }

      (node.children ?? []).forEach(fire);
    };

    (editor.state.children ?? []).forEach(fire);
  }

  /**
   * The share button: an URL that renders the article alone.
   *
   * A plain link rather than an <iframe> snippet on purpose — a link works
   * pasted anywhere (chat, mail, address bar) AND dropped into an iframe's
   * src, while markup only works in the one place that accepts markup.
   */
  async copyShareLink(): Promise<void> {
    // The document renders from the flow, so a shared article must carry where
    // the flow came from: `?flow=<url>` when it has a source, alongside embed.
    // Without it a URL-loaded flow's article would open on whatever the reader
    // had — or on nothing.
    const params = new URLSearchParams();

    if (this.currentSourceUrl) {
      params.set('flow', this.currentSourceUrl);
    }

    params.set('embed', 'doc');

    const url = `${location.origin}${location.pathname}?${params.toString()}`;

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
