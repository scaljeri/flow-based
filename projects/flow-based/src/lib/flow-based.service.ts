import { Inject, Injectable } from '@angular/core';
import {
  XXL_FLOW_TYPES,
  XxlConnection,
  XxlFlow,
  XxlFlowType,
  XxlFlowUnitState,
  XxlSocket, XxlSocketEvent,
  XxlWorker
} from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { UnitWrapper } from './utils/unit-wrapper';
import { FlowWorker } from './utils/flow-worker';
import { Flow } from './utils/flow';

let uniqueId = Date.now();

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];
  private unitBlur: () => void;
  private workers = {};
  public units: { [key: string]: UnitWrapper } = {};
  public flow: Flow;
  private state: XxlFlow;

  constructor(@Inject(XXL_FLOW_TYPES) private flowTypes: XxlFlowType) {
  }

  setState(state: XxlFlow): void {
    this.state = state;
  }

  get currentFlow(): FlowBasedComponent {
    return this.flowStack[0];
  }

  get parentFlow(): FlowBasedComponent {
    return this.flowStack[1];
  }

  getUniqueId(): number {
    return ++uniqueId;
  }

  initialize(): void {
    if (!this.state.children) {
      this.state.id = this.getUniqueId();
      this.state.children = [];
      this.state.connections = [];
    }

    this.flow = new Flow(this.flowTypes).initialize(this.state);
  }

  getWorker(id: number): XxlWorker {
    return this.flow.getWorker(id);
  }

  add(flowType: string): XxlFlowUnitState {
    const state = {
      type: flowType,
      title: this.flowTypes[flowType].title,
      id: this.getUniqueId(),
      config: this.flowTypes[flowType].config || {},
      ...(this.flowTypes[flowType].isFlow ? {children: [], connections: []} : {})
    };

    this.flow.createWorker(flowType, state.id);

    this.currentFlow.add(state);

    return state;
  }

  update(unitId: string): void {
    this.units[unitId].update();
  }

  unregister(id: number): void {
    delete this.units[id];
  }

  // Flow stuff
  activate(flow: FlowBasedComponent): void {
    this.flowStack.unshift(flow);
  }

  deactivate(): void {
    this.flowStack.shift();
  }

  blur(): void {
    if (this.unitBlur) {
      this.unitBlur();
      this.removeBlurForUnit();
    } else {
      this.currentFlow.blur();
    }
  }

  blurForUnit(cb: () => void): void {
    this.unitBlur = cb;

  }

  removeBlurForUnit(): void {
    this.unitBlur = null;
  }

  close(state: XxlFlowUnitState): void {
    this.blur();
  }

  socketClicked(event: XxlSocketEvent): void {
    this.currentFlow.onSocketClick(event);
  }

  // getWorker(unitId): XxlWorker {
  //   return this.workers[unitId];
  // }

  // getSockets(unitId: number): XxlSocket[] {
  //   return this.workers[unitId].getSockets() || [];
  // }

  delete(state: XxlFlow | XxlFlowUnitState, parentState?: XxlFlow): void {
    let flow = parentState || this.currentFlow.state,
      index = flow.children.indexOf(state);

    if (!parentState) {
      this.blur();
    }

    if (index === -1) {
      flow = this.currentFlow.state;
      index = flow.children.indexOf(state);
    }

    // Remove all connection from/to this unit
    flow.connections = flow.connections.reduce((out, conn) => {
      if (conn.to as number === state.id) {
        this.workers[state.id].removeStream(conn);
      } else if (conn.from as number === state.id) {
        this.workers[conn.to as number].removeStream(conn);
      } else {
        out.push(conn);
      }

      return out;
    }, []);

    // If it is a flow, destroy all children
    ((state as XxlFlow).children || []).forEach(child => {
      this.delete(child, state as XxlFlow);
    });

    flow.children.splice(index, 1);
  }

  destroy(): void {
    this.flow.destroy();
  }

  // Create workers and the connections between them
  private initializeFlow(flow: XxlFlow): void {
    flow.children.forEach((child: XxlFlow) => {
      const {worker} = this.flowTypes[child.type];

      if (child.children) {
        this.workers[child.id] = new FlowWorker(child);
        this.initializeFlow(child);
      } else if (worker) {
        this.workers[child.id] = new worker(child);
      }
    });

    // flow.connections.forEach((conn: XxlConnection) => {
    //   this.setupConnection(conn);
    // });
  }
}
