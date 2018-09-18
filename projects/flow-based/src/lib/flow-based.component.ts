import {
  AfterContentInit, AfterViewInit,
  Component,
  ElementRef, EventEmitter,
  forwardRef, HostBinding, HostListener,
  Inject,
  Injector, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  XXL_FLOW_TYPES,
  XxlTypes,
  XxlFlow,
  XxlWorker,
  XxlPosition,
  XXL_STATE, XXL_ACTIVE, XxlSocketEvent, XxlFlowUnitState, XxlSocket
} from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FlowUnitService } from './flow-unit-service';
import { FakeUnitWrapper } from './utils/fake-unit-wrapper';
import { DocumentService } from './utils/document.service';
import { UnitWrapper } from './utils/unit-wrapper';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  viewProviders: [ FlowUnitService ],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, AfterViewInit, AfterContentInit, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type: string;
  @Input() flow: XxlFlow;

  @Output() activeChanged = new EventEmitter<boolean>();
  @ViewChild('dragArea') area: ElementRef;

  // injectors: Injector[];
  wrapper: FakeUnitWrapper;
  onChange: (state: any) => void;
  activeFlowIndex: number = null;
  activeIndex$ = new Subject<number>();
  updateSubject = new Subject<string>();

  constructor(
    private unitService: FlowUnitService,
    private element: ElementRef,
              private injector: Injector,
              private flowService: XxlFlowBasedService,
              @Inject(XXL_FLOW_TYPES) public flowTypes: XxlTypes) {}

  ngOnInit() {
    if (this.root) {
      this.flowService.activate(this);

    }

    this.wrapper = new FakeUnitWrapper(this.element, this.updateSubject);
    this.unitService.register(this.wrapper);
  }

  ngOnChanges(obj: SimpleChanges): void {
    if (obj.active) {
      if (this.active === true) {
        this.flowService.activate(this);
      } else {
        this.flowService.deactivate();
      }
    }
    if (obj.flow) {
      if (this.flow.children.length === 0) {
      }
      // this.createInjector();
      console.log(this.flow);
    }
  }

  ngAfterViewInit(): void {
    // setTimeout(() => {
    //   console.log('ok ' + this.units.length);
    // this.units.forEach(c => {
    //   console.log(c.getSockets());
    // });
    // }, 10000);
  }

  ngAfterContentInit(): void {
    // if (this.flow.type && !this.flow.position) {
    //   this.flow.position = this.centerPosition();
    // }
  }

  @HostListener('click', ['$event'])
  onClick(event): void {
    event.stopPropagation();

    // TODO: ??
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(evt: KeyboardEvent) {
    if (this.activeFlowIndex >= 0) {
      evt.stopPropagation();
      this.activeFlowIndex = null;
    }

    this.activeIndex$.next();
  }

  onDragStart(state: XxlFlowUnitState): void {
    console.log('drag-start');
  }

  onDragEnd(state: XxlFlowUnitState): void {
    console.log('drag-end');
  }

  updateConnections(event: XxlPosition, state: XxlFlowUnitState): void {
    // this.updateSubject.next(state);

    // console.log('update connections');
    this.unitService.movement.next(state);
  }

  addUnit(unit: XxlFlowUnitState): void {
    this.flow.children.push(unit);
    // this.createInjector();
  }

  activityChanged(isActive): void {
    this.activeFlowIndex = null;

  }

  // activeFlow(): XxlFlow {
  //   return this.activeFlowIndex !== null ? this.flow.units[this.activeFlowIndex] as XxlFlow : null;
  // }
  //
  // deactivate(): void {
  //   if (this.activeFlowIndex === null) {
  //     if (!this.root) {
  //       this.flowService.deactivate();
  //       this.activeChanged.emit(false);
  //     }
  //   } else {
  //     this.entryClicked(null);
  //   }
  // }

  entryClicked(index: number): void {
    this.activeFlowIndex = index;
    this.activeIndex$.next(index);
  }

  onSocketClick(socket: XxlSocket, state: XxlFlowUnitState): void {
    this.flow.connections.push({
       from: state.id,
       out: socket.id,
       to: this.wrapper.unitId,
       in: 'fake'
    });

    this.wrapper.activate();
    // this.updateSubject.next();
  }

  isFlow(child: XxlFlow): boolean {
    return !!child.children;
  }

  close(event): void {
    console.log('blur');
    this.activeFlowIndex = null;
    // event.stopPropagation();
  }

  addBlackBox(type: string, worker: XxlWorker): void {
    // const position = this.centerPosition();
    //
    // const newBlock: XxlBlackBox = {type, position, worker};
    //
    // if (this.activeFlowIndex === null) {
    //   this.flow.units.push(newBlock);
    //
    //   this.createInjector();
    // } else {
    //   this.convertBlock2Flow(this.activeFlowIndex);
    //   (this.flow.units[this.activeFlowIndex] as XxlFlow).units.push(newBlock);
    // }
  }

  convertUnitToFlow(index: number): void {
    // const block = {
    //   type: this.flow.units[index].type,
    //   position: Object.assign({}, this.flow.units[index].position)
    // };
    //
    // (this.flow.units[index] as XxlFlow).units = [block];
    //
    // this.flow.units[index].type = 'default';
  }

  centerPosition(): XxlPosition {
    const boundingRect = this.area.nativeElement.getBoundingClientRect();

    return {x: boundingRect.width / 2, y: boundingRect.height / 2};
  }

  isActive(index: number): boolean {
    return this.activeFlowIndex === index;
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: XxlFlow): void {
    // this.flow = state;
    // this.createInjector();

  }
}
//
// function convertUnitToFlow(flow: XxlFlow, service: XxlFlowBasedService) {
//   (flow.children || []).forEach(box => {
//     if (box.type) {
//       // box.worker = service.createWorker(box);
//     }
//   });
// }
