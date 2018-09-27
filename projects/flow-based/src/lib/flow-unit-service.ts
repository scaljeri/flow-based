import { Injectable } from '@angular/core';
import { XxlFlowUnitState } from 'flow-based';
import { Subject } from 'rxjs';
import { UnitWrapper } from './utils/unit-wrapper';

let count = 0;

@Injectable()
export class FlowUnitService {
  public movement = new Subject<XxlFlowUnitState>();
  public units: {[key: string]: UnitWrapper} = {};
  id: number;

  constructor() {
    this.id = count++;
  }

  register(wrapper: UnitWrapper): void {
    this.units[wrapper.unitId] = wrapper;
  }

  unregister(id: string): void {
    delete this.units[id];
  }
}
