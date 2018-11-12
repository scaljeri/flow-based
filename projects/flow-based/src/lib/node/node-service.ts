import { Injectable } from '@angular/core';
import { ExternalEvent, FlowBasedService } from '../flow-based.service';
import { SocketDetails, XxlConnection, XxlFlowUnitState, XxlSocket, FbNodeWorker } from '../flow-based';
import { SocketService } from '../socket.service';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NodeComponent } from './node.component';

/*
Primary service for custom nodes to communicate with the framework
 */

@Injectable()
export class NodeService {
  public connections: XxlConnection[];
  public state: XxlFlowUnitState;

  private nodeMax = new Subject<boolean>();
  public nodeMax$ = this.nodeMax.asObservable();

  private nodeClicked = new Subject<PointerEvent>();
  public nodeClicked$ = this.nodeClicked.asObservable();

  private nodeComponent: NodeComponent;

  constructor(public flowService: FlowBasedService,
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
    this.flowService.nodeClicked(this.state);
  }

  register(node: NodeComponent, state: XxlFlowUnitState): void {
    this.state = state;
    this.node = node;
  }

  get id(): number {
    return this.state.id!;
  }

  calibrate(): void {
    setTimeout(() => {
      this.flowService.nodeMoved(this.id);
    });
  }

  addSocket(socket: XxlSocket): void {
    if (!socket.id) {
      socket = Object.assign({id: this.flowService.getUniqueId()}, socket);
    }

    this.flowService.flow.addSocket(socket, this.id);

    setTimeout(() => {
      this.flowService.nodeMoved(this.id);
      this.node.socketAdded();
    });
  }

  getSocket(id: number): SocketDetails {
    return this.socketService.getSocket(id);
  }

  get worker(): FbNodeWorker {
    return this.flowService.getWorker(this.id);
  }

  socketRemoved(socket: XxlSocket): void {
    this.flowService.flow.removeSocket(socket);

    this.flowService.nodeMoved(this.id);
  }

  refresh(): void {
    this.updateConnections();
  }

  deleteSelf(): void {
    this.flowService.delete(this.state);
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
    if (this.connections) {
      this.connections = [...this.connections];
    }
  }

  removeConnection(id: number): void {
    this.connections = this.connections!.filter(conn => conn.id !== id);
  }

  removeConnections(): void {
    delete this.connections;
  }
}
