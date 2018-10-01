import { Injectable } from '@angular/core';
import { XxlFlowUnitOptions, XxlFlowUnitState, XxlSocket } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { Subject } from 'rxjs';
import { UnitWrapper } from './utils/unit-wrapper';

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];
  public movement = new Subject<XxlFlowUnitState>();
  public units: {[key: string]: UnitWrapper} = {};

  constructor() {}

  // Unit stuff
  register(wrapper: UnitWrapper): void {
    this.units[wrapper.unitId] = wrapper;
  }

  update(unitId: string): void {
    this.units[unitId].update();
  }

  unregister(id: string): void {
    delete this.units[id];
  }

  // Flow stuff
  activate(flow: FlowBasedComponent): void {
    this.flowStack.unshift(flow);
  }

  deactivate(): void {
    this.flowStack.shift();
  }

  // back(): void {
  //   if (this.flowStack.length > 0) {
  //     this.deactivate();
  //     // this.flowStack[0].deactivate();
  //   }
  // }

  blur(): void {
    this.flowStack[0].blur();
  }

  add({type, isFlow = false}): void {
    const state = {
      type,
      state: {},
      id: Date.now().toString()
    };

    if (isFlow) {
      this.flowStack[0].addFlow({
        ...state,
        children: [],
        connections: []
      });
    } else {
      this.flowStack[0].addUnit(state);
    }
  }

  socketClicked(socket: XxlSocket, unitId: string): void {
    this.flowStack[0].onSocketClick(socket, unitId);
  }
}
