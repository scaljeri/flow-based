import { Inject, Injectable, Optional } from '@angular/core';
import { XXL_WORKERS, XxlConnection, XxlFlow, XxlFlowUnitState, XxlSocket, XxlTypes, XxlWorker } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { UnitWrapper } from './utils/unit-wrapper';
import { Observable, Subject } from 'rxjs';

class FlowWorker implements XxlWorker {
  setFrom(id: string, subject: Subject<any>): void {

  }

  setTo(id: string, observable: Observable<any>): void {

  }

  destroy(): void {

  }

  register(cb: () => void): void {

  }
}

@Injectable({
  providedIn: 'root'
})
export class XxlFlowBasedService {
  private flowStack: FlowBasedComponent[] = [];
  public units: {[key: string]: UnitWrapper} = {};
  private sockets = {};
  private workers = {};

  constructor(@Optional() @Inject(XXL_WORKERS) private workerClasses: XxlTypes) {}

  getWorker(id: string): XxlWorker {
    return this.workers[id];
  }

  initialize(flow: XxlFlow): void {
    if (!flow.children) {
      flow.children = [];
    }

    if (!flow.connections) {
      flow.connections = [];
    }

    if (this.workerClasses) {
      this.initializeFlow(flow);
    }
  }

  private initializeFlow(flow: XxlFlow): void {
    flow.children.forEach((child: XxlFlow) => {
      if (child.children) {
        this.workers[child.id] = new FlowWorker();
        this.initializeFlow(child);
      } else {
        this.workers[child.id] = new this.workerClasses[child.type]();
      }
    });

    flow.connections.forEach((conn: XxlConnection) => {
      this.initializeConnection(conn);
    });
  }

  private initializeConnection(conn: XxlConnection): void {
    const subject = new Subject<any>();
    const key = conn.from + conn.out;

    if (!this.sockets[key]) {
      this.sockets[key] = subject;
      this.workers[conn.from].setFrom(conn.out, subject);
    }

    this.workers[conn.to].setTo(conn.in, this.sockets[key].asObservable());
  }

  add({type, isFlow = false}): XxlFlowUnitState {
    const state = {
      type,
      state: {},
      id: Date.now().toString()
    };

    this.workers[state.id] = new this.workerClasses[type]();

    if (isFlow) {
      this.flowStack[0].addFlow({
        ...state,
        children: [],
        connections: []
      });
    } else {
      this.flowStack[0].addUnit(state);
    }


    return state;
  }

  addConnection(connection: XxlConnection): void {
    this.initializeConnection(connection);
  }

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

  socketClicked(socket: XxlSocket, unitId: string): void {
    this.flowStack[0].onSocketClick(socket, unitId);
  }
}
