import { Component, ElementRef, HostBinding, Input, OnChanges, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss']
})
export class FlowUnitComponent implements OnInit, OnChanges {
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
