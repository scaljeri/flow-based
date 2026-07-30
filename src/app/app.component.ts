import { Component, HostListener, OnInit } from '@angular/core';
import { FbNodeState, FlowBasedService } from '@scaljeri/flow-based';
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
  // isContextMenu = false;
  // contextMenuState = false;

  // menuX: number;
  // menuY: number;

  activeOverlay: OverlayRef | null = null;
  showJson = false;
  flow: FbNodeState = data.basic as FbNodeState;

  constructor(private selectionService: ComponentSelectionService,
              private flowService: FlowBasedService,
              private overlay: Overlay) {
  }

  ngOnInit(): void {
    this.selectionService.selection$.subscribe(type => {
      this.activeOverlay!.dispose();
      this.flowService.add(type);
    });

    // const worker = new Worker('fractals-worker.js');
    // worker.onmessage = (event) => {
    //   const { output } = event.data;
    //   console.log('output=' + output);
    // };
    //
    // worker.postMessage(9);
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

  onUpdate(): void {
    console.log('updated');
  }

  // Angular types `$event` as the base Event for key-modified bindings, and the
  // event was never used here anyway.
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
