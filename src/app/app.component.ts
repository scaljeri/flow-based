import { AfterContentInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { XxlFlow } from '../../projects/flow-based/src/lib/flow-based';
import { XxlFlowBasedService } from '../../projects/flow-based/src/lib/flow-based.service';
import { nested } from './fixtures';
import { Overlay, OverlayContainer, OverlayRef } from '@angular/cdk/overlay';
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

  activeOverlay: OverlayRef;
  isRunning = false;
  showJson = false;
  flowTypes = [
    {
      name: 'Random numbers',
      type: 'random-numbers'
    },
    {
      name: 'Band filter',
      type: 'band-filter'
    },
    {
      name: 'Flow',
      type: 'default',
      isFlow: true
    },
  ];

  flow: XxlFlow = nested as XxlFlow;

  @ViewChild('bg') bgImage: ElementRef;

  constructor(private selectionService: ComponentSelectionService,
              private xxlService: XxlFlowBasedService,
              private overlay: Overlay) {
  }

  ngOnInit(): void {
    this.selectionService.selection$.subscribe(type => {
      this.activeOverlay.dispose();
      const state = this.xxlService.add(type);
    });
  }

  openModal(): void {
    // this.modalService.open(content, {centered: true});

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
      this.activeOverlay.dispose();
      this.activeOverlay = null;
    });
  }

  addBlock(item: { type: string, isFlow: boolean }): void {
    // create worker
    // const worker = RandomNumberFactory();
    // this.xxlService.add(item.type, {isFlow: item.isFlow});
  }

  onUpdate(): void {
    console.log('updated');
  }

  @HostListener('document:keydown.escape', ['$event'])
  escape(event): void {
   if (this.activeOverlay) {
     this.activeOverlay.dispose();

     this.activeOverlay = null;
   } else {
     this.xxlService.blur();
   }
  }

  //
  // @HostListener('contextmenu', ['$event']) onContextMenu(event): void {
  //   event.preventDefault();
  //
  //   console.log('click=' + event.clientX + ' ' + event.clientY);
  //   if (this.isContextMenu) {
  //     this.contextMenuState = false;
  //
  //     setTimeout(() => this.isContextMenu = false, 500);
  //   } else {
  //     this.menuX = event.clientX;
  //     this.menuY = event.clientY;
  //
  //     this.isContextMenu = true;
  //
  //     setTimeout(() => {
  //       this.contextMenuState = true;
  //     }, 500);
  //   }
  // }
  //
  // @HostListener('click', ['$event']) onClick(event): void {
  //   this.contextMenuState = false;
  //
  //   setTimeout(() => this.isContextMenu = false, 500);
  // }
  //
  // closeContextMenu(type: string): void {
  //   this.contextMenuState = false;
  //
  //   setTimeout(() => {
  //     this.isContextMenu = false;
  //
  //     if (type) {
  //       this.model.entries.push({
  //         type,
  //         flow: 'sdf',
  //         x: this.menuX,
  //         y: this.menuY
  //       });
  //       console.log(this.menuX + ' ' + this.menuY);
  //     }
  //   }, 500);
  // }
}
