import { Component, HostListener, OnInit } from '@angular/core';
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
export class AppComponent implements OnInit {
  activeOverlay: OverlayRef | null = null;
  showJson = false;
  flow: FbNodeState = data.basic as FbNodeState;
  loadError: string | null = null;

  constructor(private selectionService: ComponentSelectionService,
              private flowService: FlowBasedService,
              public history: FbHistoryService,
              private overlay: Overlay) {
  }

  ngOnInit(): void {
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
