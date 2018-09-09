import {
  Component, ComponentFactoryResolver, ComponentRef,
  EventEmitter,
  HostBinding, Injector,
  Input,
  OnChanges,
  OnInit, Output,
  SimpleChanges, ViewChild, ViewContainerRef
} from '@angular/core';
import { XxlFlowUnit, XxlSocketEvent } from 'flow-based';
import { DynamicComponentDirective } from '../dynamic-component.directive';

@Component({
  selector: 'xxl-flow-unit',
  templateUrl: './flow-unit.component.html',
  styleUrls: ['./flow-unit.component.scss']
})
export class FlowUnitComponent implements OnInit, OnChanges {
  @Input() @HostBinding('class.is-active') active = false;
  @Input() component: any;
  @Input() state: any;

  @Output() socketActive = new EventEmitter<any>();
  @ViewChild(DynamicComponentDirective) ref: ComponentRef<XxlFlowUnit>;
// , { read: ViewContainerRef }) entry: ViewContainerRef;

  // private instance: ComponentRef<XxlFlowUnit>;

  constructor() {

  }

  ngOnInit() {
    console.log('yp', this.ref.instance);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const active = changes.active;

    if (active && active.currentValue !== active.previousValue && this.ref.instance) {
      this.ref.instance.setActive(active.currentValue);
    }
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
