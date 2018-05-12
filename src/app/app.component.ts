import {Component, HostListener} from '@angular/core';

@Component({
  selector: 'fb-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isContextMenu = false;
  contextMenuState = false;

  menuX: number;
  menuY: number;

  model = {
    entries: []
  };

  onUpdate(): void {
    console.log('updated');
  }

  @HostListener('contextmenu', ['$event']) onContextMenu(event): void {
    event.preventDefault();

    console.log('click=' + event.clientX + ' ' + event.clientY);
    if (this.isContextMenu) {
      this.contextMenuState = false;

      setTimeout(() => this.isContextMenu = false, 500);
    } else {
      this.menuX = event.clientX;
      this.menuY = event.clientY;

      this.isContextMenu = true;

      setTimeout(() => {
        this.contextMenuState = true;
      }, 500);
    }
  }

  @HostListener('click', ['$event']) onClick(event): void {
    this.contextMenuState = false;

    setTimeout(() => this.isContextMenu = false, 500);
  }

  closeContextMenu(type: string): void {
    this.contextMenuState = false;

    setTimeout(() => {
      this.isContextMenu = false;

      if (type) {
        this.model.entries.push({
          type,
          state: 'sdf',
          x: this.menuX,
          y: this.menuY
        });
        console.log(this.menuX + ' ' + this.menuY);
      }
    }, 500);
  }
}
