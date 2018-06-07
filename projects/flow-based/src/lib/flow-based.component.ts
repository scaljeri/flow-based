import {
  Component,
  ElementRef,
  forwardRef, HostListener,
  Inject,
  InjectionToken,
  Injector,
  Input,
  OnChanges,
  OnInit, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {XXL_FLOW_TYPES, XxlFlowBlock, XxlFlowTypes} from './flow-based';
import { FlowBasedManagerService } from './services/flow-based-manager.service';

export const XXL_FLOW_ENTRY = new InjectionToken<any>('xxl-flow-entry');

@Component({
  selector: 'xxl-flow-based',
  templateUrl: './flow-based.component.html',
  styleUrls: ['./flow-based.component.scss'],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FlowBasedComponent), multi: true}]
})
export class FlowBasedComponent implements OnInit, ControlValueAccessor {
  flowTypes: XxlFlowTypes;
  injectors: Injector[];
  onChange: (state: any) => void;
  state: XxlFlowBlock[] = [];

  @ViewChild('area') area: ElementRef;

  constructor(private element: ElementRef,
              private service: FlowBasedManagerService,
              private injector: Injector,
              @Inject(XXL_FLOW_TYPES) flowTypes: XxlFlowTypes) {
    this.flowTypes = flowTypes;
  }

  ngOnInit() {
  }

  createInjector() {
    if (this.state) {
      console.log(this.state);
      return Injector.create({
        providers: [{provide: XXL_FLOW_ENTRY, useValue: this.state}],
        parent: this.injector
      });
    }
  }

  registerOnChange(onChange: (state: any) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(): void {
  }

  writeValue(state: any): void {
    this.state = state;
    this.createInjector()
  }
}
