import { Injectable } from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';
import { SocketDetails, XxlConnection, XxlFlow, XxlFlowUnitState, XxlSocket, XxlSocketEvent, FbNodeWorker } from '../flow-based';
import { UnitWrapper } from '../utils/unit-wrapper';
import { FlowBasedConnectionService } from './flow-based-connection.service';
import { Subject } from 'rxjs';

@Injectable()
export class XxlFlowUnitService {
  public connections: XxlConnection[] = [];
  public state: XxlFlowUnitState;
  private calibrateSub = new Subject<void>();
  public calibrate$ = this.calibrateSub.asObservable();

  constructor(public flowService: XxlFlowBasedService,
              private connService: FlowBasedConnectionService) {
  }

  onSocketClick(event: XxlSocketEvent): void {
    this.connService.onSocketClick(event);
  }

  setState(state: XxlFlowUnitState): void {
    this.state = state;
  }

  get id(): number {
    return this.state.id;
  }

  rebuild(): void {
    this.connService.rebuild();
  }

  calibrate(): void {
    // this.calibrateSub.next();
  }


  addSocket(socket: XxlSocket): void {
    if (!socket.id) {
      socket = Object.assign({id: this.flowService.getUniqueId()}, socket);
    }

    this.state.sockets = [socket, ...this.state.sockets];
  }

  getSockets(): XxlSocket[] {
    return this.state.sockets;
  }

  get wrapper(): UnitWrapper {
    return this.flowService.units[this.state.id];
  }

  get worker(): FbNodeWorker {
    return this.flowService.getWorker(this.state.id);
  }

  socketRemoved(socket: XxlSocket, flow?: XxlFlow): void {
    // flow = flow || this.flowService.currentFlow.flow;
    //
    // flow.connections.forEach(conn => {
    //   if (conn.in === socket.id || conn.out === socket.id) {
    //     this.flowService.removeConnection(conn, flow);
    //   }
    // });
    //
    // if (flow === this.flowService.currentFlow.flow) {
    //   this.socketRemoved(socket, this.flowService.parentFlow.flow);
    // }
    //
    // setTimeout(() => {
    //   flow.connections.forEach((conn: XxlConnection) => {
    //     this.flowService.units[conn.from as string].update();
    //     this.flowService.units[conn.to as string].update();
    //   });
    //
    //   flow.connections = [...flow.connections];
    // });
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

  addConnection(from: HTMLElement, to: HTMLElement): number {
    const id = this.flowService.getUniqueId();

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

  removeConnection(id: number): void {
    this.connections = this.connections.filter(conn => conn.id !== id);
  }

  removeConnections(): void {
    this.connections = [];
  }

  getSocket(socketId: number): SocketDetails {
    return this.connService.getSocketDetails(socketId);
  }
}
