import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

// https://codepen.io/lbebber/pen/LELBEo

@Component({
  standalone: false,
  selector: 'fb-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Input() open = false;
  // `closed`, not `close`: an output named after a native DOM event shadows it,
  // so a parent's (close) binding could fire for either.
  @Output() closed = new EventEmitter<string | void>();

  constructor() { }

  ngOnInit() {
  }

  @HostListener('click', ['$event']) onMouseDown(event: MouseEvent): void {
    event.stopPropagation();
  }

  toggle(checked: boolean): void {
    setTimeout(() => {
      this.closed.emit();
    }, 200);
  }

  add(type: string): void {
    this.closed.emit(type);
  }
}
