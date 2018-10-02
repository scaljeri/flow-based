import { ElementRef, InjectionToken, Injector, OnChanges, OnInit } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { XxlFlowTypes } from './flow-based';
import { FlowBasedService } from './flow-based.service';
export declare const XXL_FLOW_ENTRY: InjectionToken<any>;
export declare class FlowBasedComponent implements OnInit, OnChanges, ControlValueAccessor {
    private element;
    private service;
    private injector;
    flowTypes: XxlFlowTypes;
    injectors: Injector[];
    onChange: (state: any) => void;
    state: any;
    area: ElementRef;
    constructor(element: ElementRef, service: FlowBasedService, injector: Injector, flowTypes: XxlFlowTypes);
    ngOnInit(): void;
    ngOnChanges(): void;
    createInjector(entry: any): Injector;
    registerOnChange(onChange: (state: any) => void): void;
    registerOnTouched(): void;
    writeValue(state: any): void;
}
