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
  XXL_STATE, XXL_ACTIVE, XxlSocketEvent, XxlFlowUnitState, XxlSocket, XxlConnection, XXL_FLOW_UNIT_TYPES
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
  viewProviders: [FlowUnitService],
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

  constructor(
    private unitService: FlowUnitService,
    private element: ElementRef,
    private injector: Injector,
    private flowService: XxlFlowBasedService,
    @Inject(XXL_FLOW_TYPES) public flowTypes: XxlTypes,
    @Inject(XXL_FLOW_UNIT_TYPES) public flowUnitTypes: XxlTypes) {
  }

  ngOnInit() {
    if (this.root) {
      this.flowService.activate(this);

    }

    this.wrapper = new FakeUnitWrapper(this.element);
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
  }

  ngAfterContentInit(): void {
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

  @HostListener('document:pointerdown')
  onPointerDown(): void {
    console.log('pointer down');
    if (this.wrapper.isActive) {
      this.wrapper.deactivate();

      this.flow.connections = this.flow.connections.filter(conn => conn.to !== this.wrapper.unitId);
    }
  }

  onDragStart(event: PointerEvent, state: XxlFlowUnitState): void {
    console.log('drag-start');
    const index = this.flow.children.indexOf(state);
  }

  onDragEnd(event: PointerEvent, state: XxlFlowUnitState): void {
    console.log('drag-end');
  }

  updateConnections(event: XxlPosition, state: XxlFlowUnitState): void {
    // this.updateSubject.next(state);

    // console.log('update connections');
    this.unitService.movement.next(state);
  }

  addUnit(unit: XxlFlowUnitState): void {
    // if (this.activeFlowIndex !== null) {
    //   unit = {
    //     id: Date.now().toString(),
    //     children: [unit]
    //   }
    //   const child = this.flow.children[this.activeFlowIndex];
    //   debugger;
    // } else {
    //
    // }
    this.flow.children.push(unit);
  }

  addFlow(flow: XxlFlow): void {
    debugger;
    this.flow.children.push(flow);
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

  removeConnection(conn: XxlConnection): void {
    this.flow.connections = this.flow.connections
      .filter(item => item !== conn);
  }

  onSocketClick(socket: XxlSocket, state: XxlFlowUnitState): void {
    if (this.wrapper.isActive) {
      const conn = this.flow.connections.slice(-1)[0];
      conn.to = state.id;
      conn.in = socket.id;

      this.wrapper.deactivate();
    } else {
      this.flow.connections.push({
        from: state.id,
        out: socket.id,
        to: this.wrapper.unitId,
        in: 'fake'
      });

      this.wrapper.activate();
    }
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
