import { AfterViewInit, ChangeDetectorRef, Component, HostListener, NgZone, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TypeColorsComponent } from './components/type-colors/type-colors.component';
import { ModulesDialogComponent } from './components/modules/modules-dialog.component';
import { ModulesService } from './modules.service';
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
  showJson = false;
  flow: FbNodeState = data.basic as FbNodeState;
  loadError: string | null = null;

  openModules(): void {
    this.dialog.open(ModulesDialogComponent, { width: '340px' });
  }

  openTypeColors(): void {
    this.dialog.open(TypeColorsComponent, { width: '320px' });
  }

  ngOnInit(): void {
    // Modules enabled on an earlier visit come back with the app.
    this.modules.restore();
    // For the e2e harness, which enables modules without walking the dialog.
    (window as unknown as { fbModules: ModulesService }).fbModules = this.modules;

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
    const id = this.store.currentId();
    const saved = id ? this.store.load(id) : null;

    if (id && saved) {
      this.currentFlowId = id;
      this.flow = saved;

      return;
    }

    /*
     * A fresh browser gets the demo — and the demo speaks math and graphs, so
     * those modules download first. The await matters: loading a flow whose
     * types are not registered yet would draw dead boxes.
     */
    await Promise.all([this.modules.enable('math'), this.modules.enable('graphs')]);

    /*
     * Back INSIDE the zone. zone.js does not patch dynamic import(), and the
     * module downloads above are exactly that — so this continuation runs
     * outside Angular, and an assignment here changed the field without the
     * canvas ever hearing about it. The demo was saved and never shown.
     */
    /*
     * Back INSIDE the zone — zone.js does not patch dynamic import(), and the
     * module downloads above are exactly that — and then an explicit tick:
     * measured here, re-entering the zone alone did not schedule one, so the
     * demo was saved and never shown until the next unrelated click.
     */
    this.zone.run(() => {
      this.flow = data.demo() as FbNodeState;
      this.currentFlowId = this.store.create(this.flow);
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
  }

  get flowJson(): string {
    return serializeFlowToJson(this.flow);
  }

  @HostListener('document:keydown.escape')
  escape(): void {
    if (this.showJson) {
      this.showJson = false;
    } else if (this.activeOverlay) {
      this.activeOverlay.dispose();

      this.activeOverlay = null;
    } else {
      this.flowService.triggerEvent('blur');
    }
  }
}
