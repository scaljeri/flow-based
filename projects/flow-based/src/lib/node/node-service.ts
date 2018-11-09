import { Injectable } from '@angular/core';
import { ExternalEvent, XxlFlowBasedService } from '../flow-based.service';
import { SocketDetails, XxlConnection, XxlFlowUnitState, XxlSocket, FbNodeWorker } from '../flow-based';
import { SocketService } from '../socket.service';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class NodeService {
  public connections: XxlConnection[];
  public state: XxlFlowUnitState;

  private nodeMax = new Subject<boolean>();
  public nodeMax$ = this.nodeMax.asObservable();

  private nodeClicked = new Subject<PointerEvent>();
  public nodeClicked$ = this.nodeClicked.asObservable();

  constructor(public flowService: XxlFlowBasedService,
              private socketService: SocketService) {
  }

  subscribe(type?: string): Observable<ExternalEvent> {
    return this.flowService.subscribe(this.id, type).pipe(
      filter((data: ExternalEvent) => data.nodeId === this.id && (!type || type === data.type))
    );
  }

  unsubscribe(type?: string): void {
    this.flowService.unsubscribe(this.id, type);
  }

  setMaxSize(isMax: boolean): void {
    this.nodeMax.next(isMax);
  }

  nodeIsClicked(e: PointerEvent): void {
    this.nodeClicked.next(e);
  }

  setState(state: XxlFlowUnitState): void {
    this.state = state;
  }

  get id(): number {
    return this.state.id!;
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
