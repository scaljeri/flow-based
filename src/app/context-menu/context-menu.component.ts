import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from "@angular/core";

@Component({
  selector: 'fb-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit {
  @Input() open = false;
  @Output() close = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  toggle(checked): void {
    setTimeout(() => {
      this.close.emit();
    }, 200);
  }
}
