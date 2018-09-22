import { AfterContentInit, Component, ElementRef, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { XxlFlow } from '../../projects/flow-based/src/lib/flow-based';
import { XxlFlowBasedService } from '../../projects/flow-based/src/lib/flow-based.service';
import { nested } from './fixtures';

const KEY_PRESS = {
  ESC: 27
};

@Component({
  selector: 'fb-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentInit {
  // isContextMenu = false;
  // contextMenuState = false;

  // menuX: number;
  // menuY: number;

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

  constructor(private xxlService: XxlFlowBasedService, private modalService: NgbModal) {
  }

  //
  // @HostListener('document:keydown.escape', ['$event'])
  // handleKeyboardEvent(event: KeyboardEvent) {
  //   if (event.keyCode === KEY_PRESS.ESC) {
  //     this.xxlService.back();
  //   }
  // }

  openModal(content): void {
    this.modalService.open(content, {centered: true});
  }

  addBlock(item: { type: string, isFlow: boolean }): void {
    // create worker
    // const worker = RandomNumberFactory();
    this.xxlService.add(item.type, {isFlow: item.isFlow});
  }

  onUpdate(): void {
    console.log('updated');
  }

  ngAfterContentInit(): void {
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
