import { Component, ElementRef, HostBinding, Input, OnInit } from '@angular/core';

@Component({
  selector: 'xxl-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit {
  @Input() @HostBinding('class.is-active') active = false;

  constructor(private element: ElementRef) { }

  ngOnInit() {
  }

  get socketsIn(): any[] {
    return [];
  }

  get socketsOut(): any[] {
    return [];
  }
}
