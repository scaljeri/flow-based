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

  unregister(type?: string): void {
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
    console.log('clicked');

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

  closeOnBlur(cb: () => void): void {
    this.flowService.register(this.id, () => {
      cb();
    }, 'blur');
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
    this.flowService.flow.addSocket(socket, this.id);

    setTimeout(() => {
      this.flowService.nodeMoved(this.id);
      this.nodeComponent.socketAdded();
    });
  }

  getSocket(id: number): SocketDetails {
    return this.socketService.getSocket(id);
  }

  getSockets(): SocketDetails[] {
    return (this.state.sockets || []).reduce((sockets, socket: XxlSocket) => {
      sockets.push(this.getSocket(socket.id!));

      return sockets;
    }, [] as SocketDetails[]);
  }

  get worker(): FbNodeWorker {
    return this.flowService.getWorker(this.id);
  }

  socketRemoved(socket: XxlSocket): void {
    this.flowService.removeSocket(socket);
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
    this.updateConnections();

    return id;
  }

  updateConnections(): void {
    if (this.connections) {
      this.connections = [...this.connections];
      this.nodeComponent.connectionsUpdated();
    }
  }

  removeConnection(id: number): void {
    this.connections = this.connections!.filter(conn => conn.id !== id);

    setTimeout(() => {
      this.nodeComponent.repaintConnections();
    });
  }

  removeConnections(): void {
    delete this.connections;
    this.nodeComponent.repaintConnections();
  }

  hideLabel(): void {
    this.nodeComponent.hideLabel();
  }

  showLabel(): void {
    this.nodeComponent.showLabel();
  }
}
