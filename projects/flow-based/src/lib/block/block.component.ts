import { Component, ElementRef, HostBinding, Input, OnChanges, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';

@Component({
  selector: 'xxl-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit, OnChanges {
  @Input() @HostBinding('class.is-active') active = false;

  constructor(private element: ElementRef,
              private flowService: XxlFlowBasedService) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  get socketsIn(): any[] {
    return [];
  }

  get socketsOut(): any[] {
    return [];
  }
}
