import { InjectionToken, Type } from '@angular/core';

export interface XxlFlowTypes {
  [key: string]: Type<any>;
}
//
// export interface XxlFlowEntry {
//   flowType: string;
// }


export interface XxlFlowBlockEntry {
  type: string;
  position?: { x: number, y: number };
  config?: any;
  in?: XxlFlowIN[];
  out?: XxlFlowOUT[];
  // consumers?: XxlFlowListeners[];
  factory: XxlBlockFactory;
}

export interface XxlFlowBlock {
  toString(): string; // TODO
}

export interface XxlFlowBlockFactory {
  create(): XxlFlowBlock;
}

export interface XxlFlowBlockIn {
  name: string;
}

export interface XxlFlowOUT {
  name: string;
}

export interface XxlFlowListeners {
  blockIndex: number;
  blockOUT: number;
  IN: number;
}

export const XXL_FLOW_TYPES = new InjectionToken<XxlFlowTypes>('xxl-flow-types');

export const XXL_FLOW_MODEL {

}
