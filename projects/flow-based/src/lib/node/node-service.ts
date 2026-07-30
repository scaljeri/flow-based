import { Injectable, Injector, afterNextRender } from '@angular/core';
import { FlowBasedService } from '../flow-based.service';
import { FbElementConnection, FbNodeEventCallback, FbNodeState, FbNodeWorker, FbSocket, FbSocketDetails } from '../flow-based';
import { SocketService } from '../socket.service';
import { Subject } from 'rxjs';
// Type-only: NodeComponent provides this service, so an emitted import would
// create a cycle the AOT compiler rejects (NG3003).
import type { NodeComponent } from './node.component';

/*
Primary service for custom nodes to communicate with the framework
 */

@Injectable()
export class NodeService {
  /*
   * Element-to-element lines a node type draws inside itself (see
   * addConnection). These are NOT graph edges — they never enter the Flow — which
   * is why they have their own type instead of overloading FbConnection.from/to
   * with `number | HTMLElement`.
   */
  public connections?: FbElementConnection[];
  public state!: FbNodeState;

  private nodeClicked = new Subject<PointerEvent>();
  public nodeClicked$ = this.nodeClicked.asObservable();

  private nodeComponent!: NodeComponent;
  private doubleClick?: () => void;
  private thresholdClicks = 300;
  private lastClicked = 0;

  constructor(public flowService: FlowBasedService,
              private socketService: SocketService,
              private injector: Injector) {
  }

  /**
   * Run once the DOM has settled.
   *
   * These were `setTimeout(...)`, and the deferral is genuinely needed rather
   * than a change-detection trick: <fb-connection-lines> precedes the <fb-node>
   * children in the template, so measuring socket positions in the same pass
   * reads the layout from *before* the nodes updated. afterNextRender is the
   * hook for exactly this, and unlike a macrotask it is tied to Angular's own
   * render cycle.
   */
  private afterRender(work: () => void): void {
    afterNextRender(work, { injector: this.injector });
  }

  register(callback: FbNodeEventCallback, type?: string): void {
    this.flowService.register(this.id, callback, type);
  }

  unregisterAll(): void {
    this.flowService.unregisterAll(this.id);
  }

  unregister(type?: string): void {
    this.flowService.unregister(this.id, type);
  }

  connectNode(node: NodeComponent, state: FbNodeState): void {
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

  closeOnBlur(cb: () => void): void {
    this.flowService.register(this.id, () => {
      cb();
    }, 'blur');
  }

  get id(): number {
    return this.state.id!;
  }

  calibrate(): void {
    this.afterRender(() => this.flowService.nodeMoved(this.id));
  }

  addSocket(socket: FbSocket): void {
    this.flowService.flow.addSocket(socket, this.id);

    this.afterRender(() => this.flowService.nodeMoved(this.id));
  }

  getSocket(id: number): FbSocketDetails | undefined {
    return this.socketService.getSocket(id);
  }

  /** Only sockets whose components have registered; see getSocket. */
  getSockets(): FbSocketDetails[] {
    return (this.state.sockets || []).reduce((sockets, socket: FbSocket) => {
      const details = this.getSocket(socket.id!);

      if (details) {
        sockets.push(details);
      }

      return sockets;
    }, [] as FbSocketDetails[]);
  }

  get worker(): FbNodeWorker | undefined {
    return this.flowService.getWorker(this.id);
  }

  socketRemoved(socket: FbSocket): void {
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
      this.flowService.graph.touchGeometry();
    }
  }

  removeConnection(id: number): void {
    this.connections = this.connections!.filter(conn => conn.id !== id);

    this.afterRender(() => this.flowService.graph.touchGeometry());
  }

  removeConnections(): void {
    delete this.connections;
    this.flowService.graph.touchGeometry();
  }

  hideLabel(): void {
    this.nodeComponent.hideLabel();
  }

  showLabel(): void {
    this.nodeComponent.showLabel();
  }
}
