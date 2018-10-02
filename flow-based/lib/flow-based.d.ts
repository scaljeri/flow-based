import { InjectionToken, Type } from '@angular/core';
export interface XxlFlowTypes {
    [key: string]: Type<any>;
}
export interface XxlFlowEntry {
    flowType: string;
}
export declare const XXL_FLOW_TYPES: InjectionToken<XxlFlowTypes>;
