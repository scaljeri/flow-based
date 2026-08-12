import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostBinding, HostListener, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TypeColorsComponent } from './components/type-colors/type-colors.component';
import { SocketTypesDialogComponent } from './components/socket-types/socket-types-dialog.component';
import { ModulesDialogComponent } from './components/modules/modules-dialog.component';
import { ModulesService } from './modules.service';
import { APP_VERSION } from './version';
import { FlowStoreService } from './flow-store.service';
import { FbRemoteSaveError, RemoteFlowService } from './remote-flow.service';
import { SHARE_URL_LIMIT, packJson, unpackJson } from './flow-link';
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
  private remote = inject(RemoteFlowService);
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
   * There are edits not yet Saved — the flow on screen differs from its saved
   * copy on the shelf. THE state behind the Save dot. There is no autosave: this
   * stays true, and the dot stays lit, until an explicit Save writes the saved
   * copy (and, for a remote flow, pushes it). Meanwhile the edits are kept as a
   * DRAFT in localStorage so a reload resumes them — that draft is not a save, it
   * is only so nothing is lost while `dirty` waits for Save.
   */
  dirty = false;

  /**
   * The saved copy, serialised — the baseline a change is measured against. A
   * load rebuilds the graph and that rebuild emits change events; comparing
   * against this snapshot tells a real edit from the echo of loading, so the dot
   * appears when the person changes something, not when the flow arrives. Reset
   * to the flow's current serialisation on every Save.
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
   * What sharing had to tell the person — that the flow went INTO the link
   * because it lives only here, or that it was too big to. Shown as a dismissible
   * banner rather than swallowed: packing a whole flow into a URL is a thing the
   * person should know they did.
   */
  shareNotice: string | null = null;

  /** The link the notice is about, so its Copy button has something to copy. */
  shareLink: string | null = null;

  /**
   * The notice is asking which version to share, not reporting one.
   *
   * Only when a flow HAS a home on the web but has been changed since: the
   * address shares what is published (without the change), packing shares what
   * is on screen (but the link can grow long). Neither is the obvious one, so
   * the person picks.
   */
  shareChoosing = false;

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

    const params = new URLSearchParams(window.location.search);

    /*
     * A link can carry the whole flow in it: `?flowdata=<packed>`, for a flow
     * that lives only in a browser and so has no address to point at. It wins
     * over everything — the link IS the flow. Same consent gate as any shared
     * flow (loadFromData → enableFor).
     */
    const fromData = params.get('flowdata');

    if (fromData && await this.loadFromData(fromData)) {
      return;
    }

    /*
     * Or a link can NAME a flow to open: `?flow=<url>`. It wins over the stored
     * "current" pointer — someone following a shared link means to see that
     * flow, not whatever this browser had open last. A local copy that already
     * mirrors the URL is preferred over re-fetching, so a reload does not throw
     * away edits the person saved (findBySourceUrl).
     */
    const fromUrl = params.get('flow');

    if (fromUrl) {
      // A local copy that already mirrors this URL wins over re-fetching: it may
      // carry a draft (unsaved edits) or saved changes the fetch would discard.
      const localId = this.store.findBySourceUrl(fromUrl);

      if (localId && (await this.openStored(localId, fromUrl))) {
        return;
      }

      if (await this.loadFromUrl(fromUrl)) {
        return;
      }
      // The fetch failed; loadError is showing. Fall through to the usual flow
      // so the app still opens on something rather than a blank canvas.
    }

    const id = this.store.currentId();

    if (id && (await this.openStored(id))) {
      return;
    }

    /*
     * A fresh browser opens the default showcase — a flow file we ship. It is
     * loaded through exactly the path a person's own `?flow=` link takes: the
     * app just INJECTS that step. So it comes in with its source URL set, the
     * address bar shows it, and sharing it points at that URL rather than
     * packing it — the demo is a loaded flow, not a special case. If it or its
     * lib is unreachable (offline, a broken deploy), the small starter stands
     * in rather than a blank canvas.
     */
    if (await this.loadFromUrl(AppComponent.SHOWCASE)) {
      return;
    }

    this.loadError = null;   // the fallback is not an error to shout about
    const starter = structuredClone(data.basic) as FbNodeState;

    await this.modules.enableFor(starter);

    /*
     * Back INSIDE the zone — zone.js does not patch dynamic import(), and the
     * module download above is exactly that — and then an explicit tick:
     * measured here, re-entering the zone alone did not schedule one, so the
     * flow was saved and never shown until the next unrelated click. `create`
     * gives it an entry on the shelf so it, too, is a saved flow from the start.
     */
    this.zone.run(() => {
      this.flow = starter;
      this.currentFlowId = this.store.create(starter);
      this.dirty = false;
      this.captureBaselineSoon();
      this.cdr.detectChanges();
    });
  }

  /**
   * Open a flow already on the shelf, restoring its DRAFT if it has one.
   *
   * The saved copy is the baseline; a draft (unsaved edits kept from last time)
   * takes its place on screen and comes up `dirty`, so the Save dot shows the
   * flow is out of sync with what is saved. Returns false if the id has no saved
   * copy, so boot can fall through to its next option.
   */
  private async openStored(id: string, sourceUrl?: string): Promise<boolean> {
    const saved = this.store.load(id);

    if (!saved) {
      return false;
    }

    const draft = this.store.loadDraft(id);
    const flow = draft ?? saved;

    // The flow names its own types, and a type name names its module — register
    // them before drawing, or every node comes up an empty box with no worker.
    await this.modules.enableFor(flow);

    this.zone.run(() => {
      this.history.clear();
      this.currentFlowId = id;
      this.currentSourceUrl = sourceUrl ?? this.store.sourceUrlOf(id) ?? null;
      this.store.setCurrent(id);
      this.flow = flow;

      if (draft) {
        // A restored draft is unsaved by definition; its baseline is the SAVED
        // copy, so it reads dirty and STAYS dirty (until edited back or Saved).
        this.dirty = true;
        this.loadedJson = serializeFlowToJson(saved);
      } else {
        // A clean load: baseline once the engine settles, NOT now — loading
        // resolves formats and records views, which a same-instant baseline
        // would count as edits and light the dot before anyone touched it.
        this.dirty = false;
        this.loadedJson = null;
        this.captureBaselineSoon();
      }

      this.loadError = null;
      this.reflectUrl();
      this.cdr.detectChanges();
    });

    return true;
  }

  /** Where the shipped showcase lives, relative to the app — the default open. */
  private static readonly SHOWCASE = 'assets/flows/crypto.json';

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
      // Its source is the URL, so the address bar and a re-share point at it.
      this.applyLoadedFlow(restored, url);

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
   * Open a flow carried whole in the link (`?flowdata=`), not fetched.
   *
   * A flow that lives only in a browser has no address to point at, so sharing
   * it packs the flow itself into the URL. Unpacking is the reverse — and it
   * goes through the SAME `enableFor` gate as any shared flow, so a stranger's
   * `?flowdata=` that declares a module still cannot run it without consent. Its
   * source is null: it came from the link, not from a place on the web.
   */
  private async loadFromData(data: string): Promise<boolean> {
    try {
      const restored = deserializeFlowFromJson(await unpackJson(data));

      await this.modules.enableFor(restored);
      this.applyLoadedFlow(restored, null);

      return true;
    } catch (err) {
      this.zone.run(() => {
        this.loadError = `link — ${(err as Error).message}`;
        this.cdr.detectChanges();
      });

      return false;
    }
  }

  /**
   * Show a freshly loaded flow and give it an entry on the shelf.
   *
   * Every loaded flow — from a URL, a `?flowdata=` link, or an upload — becomes a
   * saved entry the moment it opens: what came in IS its saved copy, so it opens
   * clean (no dot). Its edits then live as a draft until Save. `source` is the
   * URL it came from (for the address bar and share), or null.
   */
  private applyLoadedFlow(flow: FbNodeState, source: string | null): void {
    this.zone.run(() => {
      this.history.clear();
      this.currentSourceUrl = source;
      this.flow = flow;
      this.currentFlowId = this.store.create(flow, source ?? undefined);
      this.dirty = false;
      // Baseline once the load settles, not now — see startAutosave.
      this.loadedJson = null;
      this.captureBaselineSoon();
      this.loadError = null;
      this.reflectUrl();
      this.cdr.detectChanges();
    });
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
   * Leaving with unsaved changes: keep the draft, and warn.
   *
   * There is no autosave — the saved copy is untouched until you press Save — so
   * leaving with a lit dot means real work is unsaved, and the browser's own
   * "changes may not be saved" reminder is warranted. The DRAFT debounce may not
   * have fired yet, so flush it NOW (localStorage is synchronous, which is why
   * this works in an unload handler); coming back then resumes exactly here. The
   * warning is only the reminder; the flush is what makes "resume" true.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    this.flushDraft();

    if (this.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  // pagehide fires where beforeunload does not always (a phone discarding the
  // tab), and only needs to keep the draft — the last line of defence for it.
  @HostListener('window:pagehide')
  onPageHide(): void {
    this.flushDraft();
  }

  /** Write the pending draft right now, before the page goes. */
  private flushDraft(): void {
    clearTimeout(this.draftTimer);

    if (this.dirty && this.currentFlowId) {
      this.modules.stamp(this.flow);
      this.store.saveDraft(this.currentFlowId, this.flow);
    }
  }

  /**
   * After the view, not in ngOnInit: the editor is built by a CHILD component,
   * which does not exist yet while the parent initialises — a subscription
   * taken there was a subscription on undefined, and nothing ever saved.
   */
  ngAfterViewInit(): void {
    this.watchEdits();
  }

  /**
   * Watch the editor for edits. No autosave: an edit only raises the dot and
   * keeps a DRAFT (so a reload resumes it) — the saved copy waits for Save.
   */
  private watchEdits(): void {
    this.flowService.editor?.changes.subscribe(change => {
      // The graph, not the gestures: a pointer trail or a selection is not
      // worth a serialisation, and 'history' fires on every capture.
      if (change.kind === 'pointer' || change.kind === 'interaction'
        || change.kind === 'selection' || change.kind === 'viewport'
        || change.kind === 'history') {
        return;
      }

      /*
       * Until the baseline is set, a change is the LOAD settling, not an edit.
       * Loading a flow makes the engine write into it — format propagation
       * resolves socket formats, a plot records its view — and comparing the
       * on-screen flow to its saved copy would call all of that a change, so the
       * demo showed the dot before anyone touched it. The baseline is taken once
       * those settle; only a change AFTER it is the person's.
       */
      if (this.loadedJson === null) {
        this.captureBaselineSoon();

        return;
      }

      const changed = serializeFlowToJson(this.flow) !== this.loadedJson;

      // The dot tracks "differs from saved" exactly — editing back to the saved
      // state clears it (and the draft), so it never lies.
      if (changed !== this.dirty) {
        this.zone.run(() => {
          this.dirty = changed;
          this.cdr.detectChanges();
        });
      }

      if (changed) {
        this.saveDraftSoon();
      } else if (this.currentFlowId) {
        clearTimeout(this.draftTimer);
        this.store.clearDraft(this.currentFlowId);
      }
    });
  }

  private baselineTimer?: ReturnType<typeof setTimeout>;
  private draftTimer?: ReturnType<typeof setTimeout>;

  /** Keep the flow's unsaved state as a draft, debounced, so a reload resumes it. */
  private saveDraftSoon(): void {
    clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => {
      if (this.currentFlowId) {
        // Carry the module URLs it needs, the same as a download or a save.
        this.modules.stamp(this.flow);
        this.store.saveDraft(this.currentFlowId, this.flow);
      }
    }, 600);
  }

  /** Capture the "unchanged" baseline once a freshly loaded flow stops settling. */
  private captureBaselineSoon(): void {
    clearTimeout(this.baselineTimer);
    this.baselineTimer = setTimeout(() => {
      this.loadedJson = serializeFlowToJson(this.flow);
    }, 600);
  }

  /**
   * SAVE: write the flow's saved copy — the conscious act the dot waits for.
   *
   * Stamps the module URLs it needs (so it reopens in a browser that never heard
   * of them), writes the saved copy (which clears the draft), and resets the
   * baseline so the dot goes out. The caller pushes to a remote endpoint after,
   * if one is configured.
   */
  private persist(): void {
    if (!this.currentFlowId) {
      return;
    }

    this.modules.stamp(this.flow);
    this.store.save(this.currentFlowId, this.flow);
    this.store.setCurrent(this.currentFlowId);
    this.loadedJson = serializeFlowToJson(this.flow);
    this.dirty = false;
    clearTimeout(this.draftTimer);
  }

  openFlows(): void {
    // No silent save on open: the shelf shows each flow's SAVED copy, which is
    // the point — the dot on the toolbar already says the current one is ahead.
    this.dialog.open(FlowsDialogComponent, { width: '360px' })
      .afterClosed().subscribe((action?: FbFlowsAction) => this.onFlowsAction(action));
  }

  /** Show a plain message in the notice bar (no link, no choice). */
  private notify(message: string): void {
    this.shareChoosing = false;
    this.shareLink = null;
    this.shareNotice = message;
    this.cdr.detectChanges();
  }

  /**
   * The Save button — the conscious act, since there is no autosave.
   *
   * Every flow has an entry on the shelf, so Save always has somewhere to write.
   * It records the saved copy (clearing the draft and the dot), and then, if the
   * flow's configured destination is a remote endpoint, pushes it there too. With
   * nothing changed it says so rather than rewriting an identical copy.
   */
  saveToShelf(): void {
    if (!this.dirty) {
      this.notify('No changes yet — nothing to save.');

      return;
    }

    // The shelf copy first, always — then the network, if a destination is set.
    // The shelf is the safety net; a failed push never loses what is on screen.
    this.persist();
    this.cdr.detectChanges();

    const dest = this.currentFlowId
      ? this.store.destinationOf(this.currentFlowId)
      : { kind: 'local' as const };

    if (dest.kind === 'remote') {
      void this.pushRemote(dest.url);
    } else {
      this.notify('Saved.');
    }
  }

  /** "Save as…" — pick a name and, if wanted, an endpoint, from any state. */
  saveAs(): void {
    this.openSaveDialog();
  }

  private openSaveDialog(): void {
    const dest = this.currentFlowId ? this.store.destinationOf(this.currentFlowId) : { kind: 'local' as const };

    this.dialog.open(FlowsDialogComponent, {
      width: '360px',
      data: {
        mode: 'save',
        title: this.flow.title,
        endpoint: dest.kind === 'remote' ? dest.url : '',
      } as FbFlowsData,
    }).afterClosed().subscribe((action?: FbFlowsAction) => this.onFlowsAction(action));
  }

  /**
   * Push the flow to its remote endpoint.
   *
   * The local copy is already saved by the caller, so any failure loses nothing
   * — the notice says so. The token comes from RemoteFlowService, never from the
   * flow. On success the endpoint may hand back a canonical readable URL, which
   * then becomes the flow's source so its share link points at the saved copy.
   */
  private async pushRemote(url: string): Promise<void> {
    this.notify(`Saving to ${this.hostOf(url)}…`);

    try {
      this.modules.stamp(this.flow);
      const json = serializeFlowToJson(this.flow);
      const { canonicalUrl } = await this.remote.save(url, json);

      this.zone.run(() => {
        this.shareNotice = `Saved to ${this.hostOf(url)}.`;
        this.shareLink = null;
        this.shareChoosing = false;

        if (canonicalUrl) {
          this.currentSourceUrl = canonicalUrl;
          this.reflectUrl();
        }

        this.cdr.detectChanges();
      });
    } catch (err) {
      this.zone.run(() => {
        const auth = err instanceof FbRemoteSaveError && err.kind === 'auth';

        this.shareNotice = auth
          ? 'The endpoint rejected the token. Set a new one under “Save as…”. Your changes are kept on this device.'
          : `Save failed — ${(err as Error).message} Your changes are kept on this device.`;
        this.shareLink = null;
        this.shareChoosing = false;
        this.cdr.detectChanges();
      });
    }
  }

  private hostOf(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }

  private onFlowsAction(action?: FbFlowsAction): void {
    if (!action) {
      return;
    }

    // Opening another flow overwrites the current one on screen. With no
    // autosave, unsaved edits would be lost — so warn first, for every action
    // that replaces the flow. (Save inside the dialog does not replace it.)
    const replaces = action.kind === 'open' || action.kind === 'load'
      || action.kind === 'file' || action.kind === 'new';

    if (replaces && this.dirty
      && !confirm('This flow has unsaved changes. Open another and lose them?')) {
      return;
    }

    if (action.kind === 'open') {
      void this.openStored(action.id);

      return;
    }

    if (action.kind === 'load') {
      void this.loadFromUrl(action.url);

      return;
    }

    if (action.kind === 'file') {
      void this.loadFromFile(action.file);

      return;
    }

    if (action.kind === 'save') {
      // Rename this flow and pin it to LOCAL (dropping any endpoint), then save.
      this.flow = { ...this.flow, title: action.title };

      if (this.currentFlowId) {
        this.store.setDestination(this.currentFlowId, null);
      } else {
        this.currentFlowId = this.store.create(this.flow, this.currentSourceUrl ?? undefined);
      }

      this.persist();
      this.reflectUrl();
      this.notify('Saved.');

      return;
    }

    if (action.kind === 'save-remote') {
      // Save to an endpoint. The token goes to RemoteFlowService (keyed by
      // origin), NEVER onto the flow. The flow keeps a local copy too — the shelf
      // is the safety net — and remembers the endpoint for later saves.
      this.flow = { ...this.flow, title: action.title };

      if (action.token) {
        this.remote.setToken(action.endpoint, action.token);
      }

      if (!this.currentFlowId) {
        this.currentFlowId = this.store.create(this.flow, this.currentSourceUrl ?? undefined);
      }

      this.store.setDestination(this.currentFlowId, action.endpoint);
      this.persist();
      this.reflectUrl();
      this.cdr.detectChanges();
      void this.pushRemote(action.endpoint);

      return;
    }

    // 'new': an empty flow of its own, with no source — an entry from the start.
    const flow: FbNodeState = {
      type: 'flow', title: action.title, sockets: [], children: [], connections: [],
    } as FbNodeState;

    this.history.clear();
    this.flow = flow;
    this.currentSourceUrl = null;
    this.dirty = false;
    this.loadedJson = null;
    this.captureBaselineSoon();
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

  /**
   * Open a flow from a FILE — the third load source beside a URL and a link.
   *
   * A file has no address, so it loads in memory exactly like `?flowdata=`
   * (`applyLoadedFlow(restored, null)`): the previous flow's home, source and
   * baseline are all reset — before this it just set `this.flow`, so uploading a
   * file while a SAVED flow was open let the next autosave write the file's
   * content over that shelf entry (the fix the "must not overwrite" test guards).
   * A file from a stranger speaks its own modules, so it goes through the same
   * `enableFor` consent gate the URL and link loads do.
   */
  async loadFromFile(file: File): Promise<boolean> {
    try {
      const restored = deserializeFlowFromJson(await file.text());

      // A file names itself only when the flow inside does not — a flow that has
      // a title keeps it; "flow (3).json" is a filesystem artefact, not a name.
      if (!restored.title) {
        restored.title = file.name.replace(/\.json$/i, '');
      }

      await this.modules.enableFor(restored);
      this.applyLoadedFlow(restored, null);

      return true;
    } catch (err) {
      this.loadError = `${file.name} — ${(err as Error).message}`;
      this.cdr.detectChanges();

      return false;
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
  copyShareLink(): void {
    // Copy synchronously with a PENDING promise — packing a local flow is async,
    // and a plain `await` before writeText spends the click's permission, so the
    // copy fails (found on a phone, and headless: the button never said copied).
    // A ClipboardItem fed a promise keeps the gesture alive until the URL is ready.
    // A changed flow packs (carry the edits) even when it has an address, so a
    // shared article shows what is on screen, not the published version.
    this.copyAsync(this.buildShareUrl(true, !this.currentSourceUrl || this.dirty).then(({ url, embedded, tooBig }) => {
      this.zone.run(() => {
        this.shareLink = tooBig ? null : url;

        if (tooBig) {
          this.shareNotice = this.tooBigNotice(url, 'Host the flow’s file and share that address instead.');
        } else {
          this.shareCopied = true;
          // A local flow rode into the link — say so, as the flow share does.
          this.shareNotice = embedded
            ? 'This flow is only on your device, so the whole flow is packed into the link.'
            : null;
          setTimeout(() => {
            this.shareCopied = false;
            this.cdr.detectChanges();
          }, 2000);
        }

        this.cdr.detectChanges();
      });

      return tooBig ? '' : url;
    }));
  }

  /**
   * Copy a link to the FLOW itself (the graph), from the menu.
   *
   * A flow with a home on the web is shared by its address; a flow that lives
   * only in this browser has none, so the flow itself is packed into the link —
   * and the person is told, because a URL that carries a whole flow is a
   * different thing from one that points at a file. Too big to fit, it says so
   * and points at Download instead of handing over a link that will not open.
   */
  shareFlow(): void {
    // A flow from the web that has been changed since could be shared two ways,
    // and neither is obviously right — so ask. Otherwise there is one sensible
    // link: the address if it has one, the packed flow if it does not.
    if (this.currentSourceUrl && this.dirty) {
      this.zone.run(() => {
        this.shareChoosing = true;
        this.shareLink = null;
        this.shareNotice = 'You changed this flow since it loaded. Which version do you want to share?';
        this.cdr.detectChanges();
      });

      return;
    }

    this.doShareFlow(!this.currentSourceUrl);
  }

  /** The choice buttons on the notice. */
  shareAddress(): void {
    this.doShareFlow(false);
  }

  shareMyVersion(): void {
    this.doShareFlow(true);
  }

  private doShareFlow(forceData: boolean): void {
    this.copyAsync(this.buildShareUrl(false, forceData).then(({ url, embedded, tooBig }) => {
      this.zone.run(() => {
        this.shareChoosing = false;
        this.shareLink = tooBig ? null : url;
        this.shareNotice = tooBig
          ? this.tooBigNotice(url, 'Download it (Download JSON) and share the file instead.')
          : embedded
            ? 'Your version is packed into the link — anyone who opens it gets exactly this, no server needed. A packed link can grow long, so it may be too big to share where a plain address would fit.'
            : 'Link copied — the published version, without your local changes.';
        this.cdr.detectChanges();
      });

      return tooBig ? '' : url;
    }));
  }

  private tooBigNotice(url: string, then: string): string {
    return `This flow is ${Math.round(url.length / 1024)} KB — too big to carry in a link. ${then}`;
  }

  /**
   * Write text that is still being computed to the clipboard.
   *
   * The clipboard needs the click's permission, which an `await` would have
   * spent; `ClipboardItem` takes a PROMISE for its content, so the write is
   * requested now and fulfilled when the text is ready. Falls back to a prompt
   * where that API or the permission is missing — clunky, never silent.
   */
  private copyAsync(text: Promise<string>): void {
    const blob = text.then(value => new Blob([value], { type: 'text/plain' }));

    Promise.resolve()
      .then(() => navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]))
      .catch(() => text.then(value => {
        if (value) {
          window.prompt('Copy this link', value);
        }
      }));
  }

  /**
   * Copy the shared link again, from the button on the notice.
   *
   * A fresh click, so `writeText` is synchronous within a live gesture and
   * needs none of the ClipboardItem dance the first, async, copy did.
   */
  recopy(): void {
    if (this.shareLink) {
      void navigator.clipboard.writeText(this.shareLink)
        .catch(() => window.prompt('Copy this link', this.shareLink!));
    }
  }

  /** The person read the share notice; take it down. */
  dismissNotice(): void {
    this.shareNotice = null;
    this.shareLink = null;
    this.shareChoosing = false;
  }

  /**
   * Build the share link, and say whether the flow rode inside it and whether
   * it fits. `?flow=<url>` when the flow has a home; `?flowdata=<packed>` when it
   * does not — the flow deflated into the link. `embed=doc` on top for the
   * article view. `tooBig` is measured against what a static host will serve.
   */
  private async buildShareUrl(embedDoc: boolean, forceData = false): Promise<{ url: string; embedded: boolean; tooBig: boolean }> {
    const parts: string[] = [];
    let embedded = false;

    if (this.currentSourceUrl && !forceData) {
      parts.push(`flow=${encodeURIComponent(this.currentSourceUrl)}`);
    } else {
      // A packed flow travels alone, so it must carry the URLs of any modules it
      // needs — the same reason Download stamps them. Minified, not pretty: this
      // is bytes in a URL, and the indentation is what tips a middling flow over
      // the length a host will serve.
      this.modules.stamp(this.flow);
      parts.push(`flowdata=${await packJson(serializeFlowToJson(this.flow, false))}`);
      embedded = true;
    }

    if (embedDoc) {
      parts.push('embed=doc');
    }

    const url = `${location.origin}${location.pathname}?${parts.join('&')}`;

    return { url, embedded, tooBig: url.length > SHARE_URL_LIMIT };
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
