import { InjectionToken, Type } from '@angular/core';
import { Observable } from 'rxjs';

export const XXL_FLOW_TYPES = new InjectionToken<XxlTypes>('xxl-flow-types');
export const XXL_FLW_UNIT_SERVICE = new InjectionToken<XxlTypes>('xxl-flow-service');
export const XXL_STATE = new InjectionToken<XxlTypes>('xxl-state');
export const XXL_ACTIVE = new InjectionToken<Observable<boolean>>('xxl-active');
export const XXL_WORKERS = new InjectionToken<XxlTypes>('xxl-worker-service');

export interface XxlTypes {
  [key: string]: Type<any>;
}

export interface XxlPosition {
  x: number;
  y: number;
}

export interface XxlFlowUnit {
  title?: string;
  type: string;
  position?: XxlPosition;
  id: number;
  config: any;
}

export interface XxlComponentState {
  state: XxlFlowUnit,
  isActive$: Observable<boolean>;
}
export abstract class XxlFlowComponent {
  abstract getSockets(): XxlSocket[];
}

export interface XxlFlow extends Partial<XxlFlowUnit> {
  connections?: XxlConnection[];
  children: XxlFlowUnit[];
}

export interface XxlConnection {
  from: number;
  to: number;
  out: XxlSocket;   // from
  in:  XxlSocket;   // to
}

export interface XxlSocket {
  name: string;
  id: number;
  type: 'in' | 'out';
}

export interface XxlSocketEvent extends XxlSocket {
  element: HTMLElement;
}

// Describes the class doing the actual work
export interface XxlWorker {
  // getTitle(): string;
  // getSocket(number?): Observable<any>;
  // setSocket(number?): void;
  start(): XxlWorker;
  stop(): XxlWorker;
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
