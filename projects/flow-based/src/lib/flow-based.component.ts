import {
  Component, createInjector,
  ElementRef,
  forwardRef, HostBinding,
  Inject,
  InjectionToken,
  Injector, Input, OnChanges,
  OnInit, SimpleChanges, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { XXL_FLOW_TYPES, XxlTypes, XxlFlow, XXL_BLACK_BOX, XxlWorker, XxlBlackBox } from './flow-based';
import { XxlFlowBasedService } from './flow-based.service';

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() @HostBinding('class.is-active') active = true;
  @Input() @HostBinding('class.type') type: string;
  @Input() flow: XxlFlow;
  @ViewChild('area') area: ElementRef;

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

  ngOnInit() {
  }

  ngOnChanges(obj: SimpleChanges): void {
    if (obj.active) {
      debugger;
      if (this.active === true) {
        this.flowService.pushFlow(this);
      } else {
        this.flowService.removeFlow();
      }
    }
    if (obj.flow) {
      this.createInjector();
    }
  }

  entryClicked(index): void {
    this.activeFlowIndex = index;
  }

  addBlackBox(type: string, worker: XxlWorker): void {
    const newBlock: XxlBlackBox = {type};

    if (this.activeFlowIndex === null) {
      this.flow.units.push(newBlock);

      this.createInjector();
    } else { // Conver block to flow
      const block = Object.assign({}, this.flow.units[this.activeFlowIndex]);
      this.flow.units[this.activeFlowIndex] = block;
      (block as XxlFlow).units = [Object.assign({}, block), {type}];
    }
  }

  isFlow(item: XxlBlackBox | XxlFlow): boolean {
    const flow = item as XxlFlow;

    return flow.units !== undefined ? flow.units.length > 1 : false;
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
