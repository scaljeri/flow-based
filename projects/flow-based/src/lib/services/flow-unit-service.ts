import { Injectable } from '@angular/core';
import { XxlFlowBasedService } from '../flow-based.service';
import { XxlFlowUnitState, XxlSocket } from 'flow-based';
import { XxlSocketBuilderService } from '../socket-builder.service';

@Injectable({
  providedIn: 'root'
})
export class XxlFlowUnitService {
  public state: XxlFlowUnitState;

  constructor(private flowService: XxlFlowBasedService) {
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

  deleteSocket(socket: XxlSocket): void {

  }

  delete(): void {
    this.flowService.delete(this.state);
  }

  close(): void {
    this.flowService.close(this.state);
  }

  removeSocket(socket: XxlSocket): void {
    // TODO
  }

  requireBlur(cb: () => void): void {
    this.flowService.blurForUnit(cb);
  }

  removeBlur(): void {
    this.flowService.removeBlurForUnit();
  }
}
