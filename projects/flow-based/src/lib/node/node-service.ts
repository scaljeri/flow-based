import { Injectable } from '@angular/core';
import { FlowBasedService } from '../flow-based.service';
import { SocketDetails, XxlConnection, XxlFlowUnitState, XxlSocket, FbNodeWorker } from '../flow-based';
import { SocketService } from '../socket.service';
import { Subject } from 'rxjs';
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
  private doubleClick: () => void;
  private thresholdClicks = 300;
  private lastClicked = 0;

  constructor(public flowService: FlowBasedService,
              private socketService: SocketService) {
  }

  register(callback: (ExternalEvent) => boolean | void, type?: string): void {
    this.flowService.register(this.id, callback, type);
  }

  unregisterAll(): void {
    this.flowService.unregisterAll(this.id);
  }

  unregister(id: string, type?: string): void {
    this.flowService.unregister(this.id, type);
  }

  connectNode(node: NodeComponent, state: XxlFlowUnitState): void {
    this.state = state;
    this.nodeComponent = node;
  }

  setMaxSize(isMax: boolean): void {
    this.nodeComponent.setMaxSize(isMax);
    this.calibrate();
  }

  nodeIsClicked(e: PointerEvent): void {
    this.nodeClicked.next(e);
    this.flowService.nodeClicked(this.state);

    if (Date.now() - this.lastClicked < this.thresholdClicks) {
      if (this.doubleClick) {
        this.doubleClick();
        this.nodeComponent.setMaxSize(false);
      }
    } else {
      this.lastClicked = Date.now();
    }
  }

  closeOnDoubleClick(callback: () => void, threshold = 300): void {
    this.thresholdClicks = threshold;
    this.doubleClick = callback;
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
    // if (!socket.id) {
    //   socket = Object.assign({id: this.flowService.getUniqueId()}, socket);
    // }

    this.flowService.flow.addSocket(socket, this.id);

    setTimeout(() => {
      this.flowService.nodeMoved(this.id);
      this.nodeComponent.socketAdded();
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
