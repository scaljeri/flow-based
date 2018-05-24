import {AfterContentInit, Component, ElementRef, HostListener, ViewChild} from "@angular/core";
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {RANDOM_NUMBERS_CONFIG} from './components/random-numbers/random-numbers.component';

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
  sources = {
    random: {
      type: 'random-numbers',
      config: RANDOM_NUMBERS_CONFIG
    }
  };

  selected: any;

  model = {
    entries: []
  };

  @ViewChild('bg') bgImage: ElementRef;

  constructor(private modalService: NgbModal) {}

  openModal(content): void {
    this.modalService.open(content, { centered: true });
  }

  addSource(source: string): void {
    console.log('add block', source);
    this.selected = this.sources[source];
  }

  addBlock(): void {
    if (this.selected) {
      this.model.entries.push(this.selected);
    }
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
  //         state: 'sdf',
  //         x: this.menuX,
  //         y: this.menuY
  //       });
  //       console.log(this.menuX + ' ' + this.menuY);
  //     }
  //   }, 500);
  // }
}
