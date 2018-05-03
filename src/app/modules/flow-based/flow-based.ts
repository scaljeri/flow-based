import { InjectionToken, Type } from '@angular/core';

export interface XxlFlowTypes {
  [key: string]: Type<any>;
}

export interface XxlFlowEntry {
  flowType: string;
}

export const XXL_FLOW_TYPES = new InjectionToken<XxlFlowTypes>('xxl-flow-types');
