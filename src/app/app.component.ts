import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { XxlFlow } from '../../projects/flow-based/src/lib/flow-based';
import { FlowBasedService } from '../../projects/flow-based/src/lib/flow-based.service';
import * as data from './fixtures';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { ComponentPortal } from '@angular/cdk/portal';
import { ComponentSelectionService } from './component-selection.service';

const KEY_PRESS = {
  ESC: 27
};

@Component({
  selector: 'fb-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // isContextMenu = false;
  // contextMenuState = false;

  // menuX: number;
  // menuY: number;

  activeOverlay: OverlayRef | null;
  showJson = false;
  flow: XxlFlow = data.basic as XxlFlow;

  @ViewChild('bg') bgImage: ElementRef;

  constructor(private selectionService: ComponentSelectionService,
              private flowService: FlowBasedService,
              private overlay: Overlay) {
  }

  ngOnInit(): void {
    this.selectionService.selection$.subscribe(type => {
      this.activeOverlay!.dispose();
      this.flowService.add(type);
    });

    const worker = new Worker('fractals-worker.js');
    worker.onmessage = (event) => {
      const { output } = event.data;
      console.log('output=' + output);
      debugger;
    };

    worker.postMessage(9);
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

    this.activeOverlay.backdropClick().subscribe((e: PointerEvent) => {
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

  @HostListener('document:keydown.escape', ['$event'])
  escape(event): void {
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
