import { InjectionToken, Type } from '@angular/core';
import { Observable } from 'rxjs';

export const XXL_FLOW_TYPES = new InjectionToken<XxlTypes>('xxl-flow-types');
export const XXL_FLOW_UNIT_STATE = new InjectionToken<XxlTypes>('xxl-flow-unit-state');
export const XXL_FLOW_UNIT_SERVICE = new InjectionToken<XxlTypes>('xxl-flow-service');
export const XXL_STATE = new InjectionToken<XxlTypes>('xxl-state');
// export const XXL_WORKERS = new InjectionToken<XxlTypes>('xxl-worker-service');

export interface XxlFlowType {
  component: any;
  config?: any;
  isFlow?: boolean;
  title?: string;
  type: string;
}

export interface XxlFlowUnit {
  getSockets(): XxlSocket[];
  setActive(boolean): void;
}

export interface XxlFlowUnitOptions {
  isFlow?: boolean;
}

export interface XxlTypes {
  [key: string]: { title: string, component: Type<any>, isFlow: boolean, config: any };
}

export interface XxlPosition {
  x: number;
  y: number;
}

export interface XxlFlowUnitState {
  type: string;
  id?: string;
  config?: any;
  title?: string;
  position?: XxlPosition;
}

export interface XxlFlow extends Partial<XxlFlowUnitState> {
  connections: XxlConnection[];
  children: (XxlFlowUnitState | XxlFlow)[];
}

export interface XxlConnection {
  from: string;
  out: string;   // from
  to: string;
  in:  string;   // to
  id: string;
}


export type XxlSocketType = 'in' | 'out';

export interface XxlSocket {
  name?: string;
  id: string;
  position: number;
  type: XxlSocketType;
}

export interface XxlSocketEvent extends XxlSocket {
  socket: XxlSocket;
  element: HTMLElement;
}

// Describes the class doing the actual work
export interface XxlWorker {
  getSockets(): XxlSocket[];
  getStream?(id: string): Observable<any>;
  setStream?(stream: Observable<any>, id?: string): void;
  removeStream?(id: string): void;
  destroy(): void;
}

export interface XxlWorkerService {
  create(id: string, type: string): XxlWorker;
}

export class XxlDriver {
  private flow: XxlFlow[];
  private workers: XxlWorker[];
  private connections = [] as XxlConnection[];
  private running = false;

  delete(index: number):  void {

  }

  add(unit: XxlFlow): void {

  }

  connectSockets(connection: XxlConnection): void {
    this.connections.push(connection);

    if (this.running) {
      // build connection
    }
  }

  start(): void {
    // this.blocks = [];
    this.running = true;

    // this.flowEntries.forEach((entry: XxlFlowUnit) => {
      // this.workers.push(entry.factory.create(entry.config).start());
    // });

    // Loop through connections
  }

  stop(): void {
    this.running = false;

    // this.workers.forEach((block: XxlWorker) => block.stop());
  }
}

export abstract class FlowBasedServiceHelper {
  private flowHandlers;

  abstract createWorker(type: string): XxlWorker;

  addFlowHandler(callback: (type: string, worker: XxlWorker) => void): void {
    this.flowHandlers.unshift(callback);
  }

  removeFlowHandler(): void {
    this.flowHandlers.shift();
  }


}
