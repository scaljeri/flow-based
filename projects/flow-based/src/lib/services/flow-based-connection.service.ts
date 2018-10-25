import { Injectable } from '@angular/core';
import { ConnectionDetails, SocketDetails, XxlConnection, XxlFlow, XxlPosition, XxlSocket, XxlSocketEvent } from 'flow-based';
import { XxlFlowBasedService } from '../flow-based.service';
import { Subject } from 'rxjs';
import { SocketComponent } from '../socket/socket.component';


@Injectable()
export class FlowBasedConnectionService {
  public state: XxlFlow;
  private newSubject = new Subject<ConnectionDetails>();
  private rmSubject = new Subject<ConnectionDetails>();
  public new$ = this.newSubject.asObservable();
  public remove$ = this.rmSubject.asObservable();
  public resetSubject = new Subject<void>();
  public reset$ = this.resetSubject.asObservable();
  private connection: XxlConnection = {} as XxlConnection;
  private sockets: { [key: number]: SocketDetails } = {};
  private connectionDetails: ConnectionDetails;

  private activeSocketSubject = new Subject<XxlSocket>();
  public activeSocket$ = this.activeSocketSubject.asObservable();
  private doRebuild = false;

  constructor(private service: XxlFlowBasedService) {
    this.clear();
  }

  setState(state: XxlFlow): void {
    this.state = state;
  }

  initialize(state: XxlFlow): void {
    this.state = state;

    this.initConnections();
  }

  initConnections(): void {
    this.state.connections.forEach(c => {
      this.newSubject.next({
        connection: c,
        sockets: {
          [c.in]: this.getSocket(c.in),
          [c.out]: this.getSocket(c.out),
        }
      });
    });

    if (this.doRebuild) {
      this.doRebuild = false;
      this.initConnections();
    }
  }

  onSocketClick(event: XxlSocketEvent): void {
    this.connectionDetails.sockets[event.socket.id] = event.socket;

    if (event.socket.type === 'in') {
      this.connection.to = event.parentId;
      this.connection.in = event.socket.id;
    } else {
      this.connection.from = event.parentId;
      this.connection.out = event.socket.id;
    }

    if (this.connection.from && this.connection.to) {
      this.connection.id = this.service.getUniqueId();
      this.service.flow.connect(this.connection);

      this.connectionDetails.connection = this.connection;
      this.newSubject.next(this.connectionDetails);

      this.state.connections = [...this.state.connections, this.connection];
      this.clear();
      this.resetSubject.next();
      this.initConnections();
    } else {
      this.activeSocketSubject.next(event);
    }
  }

  rebuild(): void {
    this.doRebuild = true;
  }

  clear(): void {
    this.connection = {} as XxlConnection;
    this.connectionDetails = {sockets: {}, connection: {}} as ConnectionDetails;
    this.activeSocketSubject.next(null);
  }

  getSocket(id: number): XxlSocket {
    return this.sockets[id].comp.state;
  }

  getSocketDetails(id: number): SocketDetails {
    return this.sockets[id];
  }

  addSocket(socket: SocketComponent): void {
    this.sockets[socket.state.id] = {
      comp: socket,
      parentId: socket.parent,
      position: this.determinePosition(socket)
    };
  }

  removeSocket(socketId: number): void {
    delete this.sockets[socketId];
  }

  updatePositionSockets(sockets: XxlSocket[]): void {
    sockets.forEach(socket => {
      const details = this.sockets[socket.id];
      details.position = this.determinePosition(details.comp);
    });

    this.update();
  }

  update(): void {
    if (this.state) {
      this.state.connections = [...this.state.connections];
    }
  }

  getSocketPosition(socketId: number): XxlPosition {
    return this.sockets[socketId].position;
  }

  private determinePosition(comp: SocketComponent): XxlPosition {
    const rect = comp.element.nativeElement.getBoundingClientRect();

    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }

  // -------------------------

  socketRemoved(socketId: string): void {
    // TODO: Update connections array
  }

  remove(connection: XxlConnection): void {
    this.state.connections = this.state.connections.filter(conn => conn.id !== connection.id);

    this.resetSubject.next();
    this.initConnections();
  }

  getConnections(type: string, id: number): XxlConnection[] {
    return this.state.connections.filter(conn => conn[type === 'in' ? 'to' : 'from'] === id);
  }
}
