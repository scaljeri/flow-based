import {
  AfterContentInit,
  Component, createInjector,
  ElementRef, EventEmitter,
  forwardRef, HostBinding, HostListener,
  Inject,
  InjectionToken,
  Injector, Input, OnChanges,
  OnInit, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { XXL_FLOW_TYPES, XxlTypes, XxlFlow, XXL_BLACK_BOX, XxlWorker, XxlBlackBox, XxlPosition } from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, AfterContentInit, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.is-root') root = true;
  @Input() @HostBinding('class.type') type: string;
  @Input() flow: XxlFlow;

  @Output() activeChanged = new EventEmitter<boolean>();
  @ViewChild('dragArea') area: ElementRef;

  flowTypes: XxlTypes;
  injectors: Injector[];
  onChange: (state: any) => void;
  activeFlowIndex: number = null;
  id: number;

  constructor(private element: ElementRef,
              private injector: Injector,
              private flowService: XxlFlowBasedService,
              @Inject(XXL_FLOW_TYPES) flowTypes: XxlTypes) {
    this.flowTypes = flowTypes;
    this.id = Math.random();
    console.log(this.id);
  }

  @HostListener('click', ['$event'])
  onClick(event): void {
    console.log(this.id);
    event.stopPropagation();
  }

  ngOnInit() {
  }

  ngOnChanges(obj: SimpleChanges): void {
    if (obj.active) {
      if (this.active === true) {
        console.log(this.id +   ' active');
        this.flowService.pushFlow(this);
      } else {
        this.flowService.removeFlow();
      }
    }
    if (obj.flow) {
      this.createInjector();
      console.log(this.flow);
    }
  }

  ngAfterContentInit(): void {
    // if (this.flow.type && !this.flow.position) {
    //   this.flow.position = this.centerPosition();
    // }
  }

  activityChanged(isActive): void {
    console.log(this.id + ' activityChanged');
    this.activeFlowIndex = null;

  }

  // activeFlow(): XxlFlow {
  //   return this.activeFlowIndex !== null ? this.flow.units[this.activeFlowIndex] as XxlFlow : null;
  // }

  deactivate(): void {
    if (this.activeFlowIndex === null) {
      if (!this.root) {
        this.flowService.removeFlow();
        this.activeChanged.emit(false);
      }
    } else {
      this.activeFlowIndex = null;
    }
  }

  entryClicked(index): void {
    if (this.isFlow()) {
      this.activeFlowIndex = index;
    }
  }

  isBlackBox(unit: XxlFlow | XxlBlackBox): boolean {
    return !!(unit as XxlFlow).units;
  }

  addBlackBox(type: string, worker: XxlWorker): void {
    const position = this.centerPosition();

    if (this.flow.units.length === 0 && !this.root) {
      this.prepareForFlow();
    }

    const newBlock: XxlFlow = {type, position, units: []};

    if (this.activeFlowIndex === null) {
      this.flow.units.push(newBlock);

      this.createInjector();
    } else {
      const block = this.flow.units[this.activeFlowIndex];
      (block as XxlFlow).units = [Object.assign({}, block,
        {position: Object.assign({}, block.position)}),
        newBlock];
    }
  }

  prepareForFlow(): void {
    this.flow.units.push({
      position: { x: 0, y: 0},
      type: this.flow.type,
      units: []
    });
    this.flow.type = 'default';
  }

  centerPosition(): XxlPosition {
    const boundingRect = this.area.nativeElement.getBoundingClientRect();

    return {x: boundingRect.width / 2, y: boundingRect.height / 2};
  }

  isFlow(): boolean {
    return this.root || this.flow && this.flow.units.length > 0;
  }

  isActive(index: number): boolean {
    return this.activeFlowIndex === index;
  }

  createInjector(): void {
    if (this.flow && this.flow.units) {
      this.injectors = (this.flow.units.map(state => {
        return Injector.create({
          providers: [{provide: XXL_BLACK_BOX, useValue: state}],
          parent: this.injector
        });
      }));
    }
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: XxlFlow): void {
    // this.flow = state;
    // console.log(this.id, state);
    // this.createInjector();

  }
}
