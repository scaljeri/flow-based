import { AfterContentInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { XxlFlow } from '../../projects/flow-based/src/lib/flow-based';
import { XxlFlowBasedService } from '../../projects/flow-based/src/lib/flow-based.service';
import { RandomNumberFactory } from './shared/random-numbers';

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

  flowTypes = [
    { name: 'Random numbers',
      type: 'random-numbers' },
    { name: 'Band filter',
      type: 'band-filter' },
  ];

  flow: XxlFlow = {
    units: []
  };

  @ViewChild('bg') bgImage: ElementRef;

  constructor(private xxlService: XxlFlowBasedService, private modalService: NgbModal) {
  }

  openModal(content): void {
    this.modalService.open(content, {centered: true});
  }

  addBlock(item): void {
    // create worker
    const worker = RandomNumberFactory();
    this.xxlService.add(item, worker);
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
