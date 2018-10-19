import { Injectable } from '@angular/core';
import { XxlPosition, XxlSocket, XxlSocketEvent } from 'flow-based';
import { SocketComponent } from '../socket/socket.component';
import { FlowBasedConnectionService } from './flow-based-connection.service';
import { ReplaySubject } from 'rxjs';
import { XxlFlowBasedService } from '../flow-based.service';

interface SocketDetails {
  comp: SocketComponent;
  position: XxlPosition;
}

@Injectable()
export class FlowBasedSocketService {
  private sockets: { [key: string]: SocketDetails } = {};
  private activeSocketId: string;
  private subject = new ReplaySubject<XxlSocketEvent>(1);
  public activeSocket$ = this.subject.asObservable();

  constructor(private connectionService: FlowBasedConnectionService,
              private flowService: XxlFlowBasedService) {
  }

  getSocketPosition(socketId: number): XxlPosition {
    return this.sockets[socketId].position;
  }

  onClicked(event?: XxlSocketEvent): void {
    if (event) {
      this.flowService.socketClicked(event);
    }

    this.subject.next(event);
  }

  blur(): void {
    this.subject.next(null);
  }

  updatePosition(sockets: XxlSocket[]): void {
    sockets.forEach(socket => {
      const details = this.sockets[socket.id];
      details.position = this.determinePosition(details.comp);
    });
  }

  add(comp: SocketComponent): void {
    this.sockets[comp.id] = {comp, position: this.determinePosition(comp)};
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

  deactivate(): void {
    this.activeSocketId = null;
  }

  remove(socketId: string): void {
    this.connectionService.socketRemoved(socketId);

    delete this.sockets[socketId];
  }
}
