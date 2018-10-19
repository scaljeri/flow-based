import { Injectable } from '@angular/core';
import { XxlPosition, XxlSocket } from 'flow-based';
import { SocketComponent } from '../socket/socket.component';
import { FlowBasedConnectionService } from './flow-based-connection.service';

interface SocketDetails {
  comp: SocketComponent;
  position: XxlPosition;
}

@Injectable()
export class FlowBasedSocketService {
  private sockets: { [key: string]: SocketDetails } = {};
  private activeSocketId: string;

  constructor(private connectionService: FlowBasedConnectionService) {
  }

  getSocketPosition(socketId: number): XxlPosition {
    return this.sockets[socketId].position;
  }

  onClick(socketId: number): void {
    // TODO
  }

  updatePosition(sockets: XxlSocket[]): void {
    sockets.forEach(socket => {
      const details = this.sockets[socket.id];
      details.position = this.determinePosition(details.comp);
    });
  }

  add(comp: SocketComponent): void {
    this.sockets[comp.id] = { comp, position: this.determinePosition(comp) };
  }

  private determinePosition(comp: SocketComponent): XxlPosition {
    const rect = comp.element.nativeElement.getBoundingClientRect();
    console.log('****');

    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }

  unregister(id: string) {
    delete this.sockets[id];
  }

  setActiveSocket(socket: XxlSocket): void {
    // this.sockets[socket.id]
  }

  activate(socketId: string): void {
    this.activeSocketId = socketId;
  }

  deactivate(): void {
    this.activeSocketId = null;
  }

  remove(socketId: string): void {
    this.connectionService.socketRemoved(socketId);

    delete this.sockets[socketId];
  }
}
