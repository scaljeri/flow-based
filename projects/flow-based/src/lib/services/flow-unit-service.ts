import { Injectable } from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';
import { SocketDetails, XxlConnection, XxlFlowUnitState, XxlSocket, FbNodeWorker } from '../flow-based';
import { SocketService } from '../socket.service';

@Injectable()
export class XxlFlowUnitService {
  public connections: XxlConnection[];
  public state: XxlFlowUnitState;

  constructor(public flowService: XxlFlowBasedService,
              private socketService: SocketService) {
  }

  setState(state: XxlFlowUnitState): void {
    this.state = state;
  }

  get id(): number {
    return this.state.id!;
  }

  rebuild(): void {
  }

  calibrate(): void {
    this.flowService.socketAdded();
  }

  addSocket(socket: XxlSocket): void {
    if (!socket.id) {
      socket = Object.assign({id: this.flowService.getUniqueId()}, socket);
    }

    this.state.sockets = [socket, ...this.getSockets()];
    this.flowService.flow.addSocket(socket.id!, this.id);

    setTimeout(() => {
      this.flowService.currentFlow.updateConnections();
    });
  }

  getSocket(id: number): SocketDetails {
    return this.socketService.getSocket(id);
  }

  getSockets(): XxlSocket[] {
    return this.state.sockets || [];
  }

  get worker(): FbNodeWorker {
    return this.flowService.getWorker(this.id);
  }

  socketRemoved(socket: XxlSocket): void {
    this.flowService.flow.removeSocket(socket);

    this.flowService.parentFlow.updateConnections();
  }

  refresh(): void {
    this.updateConnections();
  }

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

    this.connections = [...(this.connections || []), conn];

    return id;
  }

  updateConnections(): void {
    this.connections = [...this.connections];
  }

  removeConnection(id: number): void {
    this.connections = this.connections!.filter(conn => conn.id !== id);
  }

  removeConnections(): void {
    delete this.connections;
  }
}
