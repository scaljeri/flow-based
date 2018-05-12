import {Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild} from '@angular/core';

// https://codepen.io/lbebber/pen/LELBEo

@Component({
  selector: 'fb-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Input() open = false;
  @Output() close = new EventEmitter<string | void>();

  constructor() { }

  ngOnInit() {
  }

  @HostListener('click', ['$event']) onMouseDown(event): void {
    event.stopPropagation();
  }

  toggle(checked): void {
    setTimeout(() => {
      this.close.emit();
    }, 200);
  }

  add(type: string): void {
    this.close.emit(type);
  }
}
