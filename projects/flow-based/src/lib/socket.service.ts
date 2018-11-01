import { Injectable } from '@angular/core';
import { XxlFlowBasedService } from './flow-based.service';
import { ConnectionDetails, FbKeyValues, SocketDetails, XxlConnection, XxlSocketEvent } from './flow-based';
import { Subject } from 'rxjs';


@Injectable({providedIn: 'root'})
export class SocketService {
  private connectionDetails: ConnectionDetails;
  private socketClicked = new Subject<XxlSocketEvent>();
  public socketClicked$ = this.socketClicked.asObservable();
  private connection: XxlConnection = {} as XxlConnection;

  public sockets: FbKeyValues<SocketDetails> = {};

  constructor(private service: XxlFlowBasedService) {
    this.clear();
  }

  addSocket(id: number, sd: SocketDetails): void {
    this.sockets[id] = sd;
    this.service.flow.addSocket(id, sd.parentId);
  }

  getSocket(id: number): SocketDetails {
    return this.sockets[id];
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

    if (this.connection.from && this.connection.to) { // Complete
      this.connection.id = this.service.getUniqueId();
      this.service.addConnection(this.connection);

      this.connectionDetails.connection = this.connection;

      this.clear();
    } else {
      this.socketClicked.next(event);
    }
  }

  clear(): void {
    this.connection = {} as XxlConnection;
    this.connectionDetails = {sockets: {}, connection: {}} as ConnectionDetails;
    this.socketClicked.next(null);
  }

  clearPosition(id?: number): void {
    Object.keys(this.sockets).map(k => this.sockets[k])
      .filter((s: SocketDetails) => !id || s.parentId === id)
      .forEach(s => s.comp.reset());
  }
}


