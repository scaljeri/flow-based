import { Injectable } from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';
import { XxlConnection, XxlFlow, XxlFlowUnitState, XxlSocket, XxlWorker } from '../flow-based';
import { XxlSocketBuilderService } from '../socket-builder.service';
import { UnitWrapper } from '../utils/unit-wrapper';

@Injectable()
export class XxlFlowUnitService {
  public connections: XxlConnection[] = [];
  public state: XxlFlowUnitState;

  constructor(public flowService: XxlFlowBasedService) {
  }

  setState(state: XxlFlowUnitState): void {
    this.state = state;

  }

  addSocket(socket: XxlSocket): void {
    if (!socket.id) {
      socket = Object.assign(XxlSocketBuilderService.create(socket.type), socket);
    }

    this.state.sockets = [socket, ...this.state.sockets];
  }

  get wrapper(): UnitWrapper {
    return this.flowService.units[this.state.id];
  }

  get worker(): XxlWorker {
    return this.flowService.getWorker(this.state.id);
  }

  socketRemoved(socket: XxlSocket, flow?: XxlFlow): void {
    flow = flow || this.flowService.currentFlow.flow;

    flow.connections.forEach(conn => {
      if (conn.in === socket.id || conn.out === socket.id) {
        this.flowService.removeConnection(conn, flow);
      }
    });

    if (flow === this.flowService.currentFlow.flow) {
      this.socketRemoved(socket, this.flowService.parentFlow.flow);
    }

    setTimeout(() => {
      flow.connections.forEach((conn: XxlConnection) => {
        this.flowService.units[conn.from as string].update();
        this.flowService.units[conn.to as string].update();
      });

      flow.connections = [...flow.connections];
    });
  }

  // removeSocket(socket: XxlSocket, connections?: XxlConnection[]): void {
  //   (connections || (this.state as XxlFlow).connections).forEach(conn => {
  //     if (conn.in === socket.id || conn.out === socket.id) {
  //       this.flowService.removeConnection(conn);
  //     }
  //
  //     if (!connections && this.flowService.parentFlow) {
  //       // TODO: Hack
  //       debugger;
  //       // this.removeSocket(socket, this.flowService.flowStack[1].flow.connections);
  //     }
  //   });
  // }

  requireBlur(cb: () => void): void {
    this.flowService.blurForUnit(cb);
  }

  removeBlur(): void {
    this.flowService.removeBlurForUnit();
  }

  deleteSelf(): void {
    this.flowService.delete(this.state);
  }

  closeSelf(): void {
    this.flowService.close(this.state);
  }

  addConnection(from: HTMLElement, to: HTMLElement): string {
    const id = Math.random().toString();

    const conn = {
      id,
      from: from,
      to: to
    };

    this.connections = [...this.connections, conn];

    return id;
  }

  updateConnections(): void {
    this.connections = [...this.connections];
  }

  removeConnection(id: string): void {
    this.connections = this.connections.filter(conn => conn.id !== id);
  }

  removeConnections(): void {
    this.connections = [];
  }
}
