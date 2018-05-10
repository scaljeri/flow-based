import {Component, HostBinding, HostListener} from "@angular/core";

@Component({
  selector: "fb-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  isContextMenu = false;
  contextMenuState = false;

  menuX: number;
  menuY: number;

  model = {
    entries: [
      {
        type: 'source',
        state: 'hi'
      }
    ]
  };

  onUpdate(): void {
    console.log('updated');
  }

  @HostListener('contextmenu', ['$event']) onContextMenu(event): void {
    event.preventDefault();

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

  // @HostListener('click', ['$event']) onClick(event): void {
  //   this.contextMenuState = false;
  //
  //   setTimeout(() => this.isContextMenu = false, 500);
  // }

  closeContextMenu(): void {
    setTimeout(() => {
      this.contextMenuState = false;
      this.isContextMenu = false;
    }, 500);
  }

}
