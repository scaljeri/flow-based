import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnInit, Output,
  SimpleChange,
  SimpleChanges, ViewChildren
} from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';
import { XxlFlowComponent, XxlSocketEvent } from 'flow-based';

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss']
})
export class FlowUnitComponent implements OnInit, OnChanges {
  @Input() @HostBinding('class.is-active') active = false;
  @Output() socketActive = new EventEmitter<any>();

  constructor(private element: ElementRef,
              private flowService: XxlFlowBasedService) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  socketClick(type: string, event: PointerEvent): void {
    event.stopImmediatePropagation();

    this.socketActive.emit({ } as XxlSocketEvent);
  }

  get socketsIn(): any[] {
    return [];
  }

  get socketsOut(): any[] {
    return [];
  }
}
