import { InjectionToken, Type } from '@angular/core';

export const XXL_FLOW_TYPES = new InjectionToken<XxlTypes>('xxl-flow-types');
export const XXL_FLOW_SERVICE = new InjectionToken<XxlTypes>('xxl-flow-service');
export const XXL_BLACK_BOX = new InjectionToken<XxlTypes>('xxl-black-box');

export interface XxlTypes {
  [key: string]: Type<any>;
}

export interface XxlFlow {
  units: (XxlBackBox | XxlFlow)[];
  connections?: XxlConnection[];
}

export interface XxlBackBox {
  type: string;
  x?: number;
  y?: number;
}

export interface XxlConnection {
  from: XxlBackBox;
  to: XxlBackBox;
  out: XxlSocket;   // from
  in:  XxlSocket;   // to
}

export interface XxlSocket {
  name: string;
  id: number;
}

// Describes the class doing the actual work
export interface XxlWorker {
  // getTitle(): string;
  // getSocket(number?): Observable<any>;
  // setSocket(number?): void;
  // start(): XxlWorker;
  // stop(): XxlWorker;
  destroy(worker: XxlWorker): void;
}

export interface XxlService {
  createWorker(type: string): XxlWorker;
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
