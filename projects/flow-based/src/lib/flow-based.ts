import { InjectionToken, Type } from '@angular/core';
import { Observable } from 'rxjs';
// Type-only: SocketComponent imports this module back, and an emitted import
// would create a cycle the AOT compiler rejects (NG3003).
import type { SocketComponent } from './socket/socket.component';

export const XXL_FLOW_TYPES = new InjectionToken<FbNodeTypes>('xxl-flow-types');
export const XXL_FLOW_UNIT_STATE = new InjectionToken<FbNodeState>('xxl-flow-unit-state');
export const FB_NODE_HELPERS = new InjectionToken<FbNodeHelpers>('fb-node-helpers');
export const FB_SOCKET_COLORS = new InjectionToken<FbSocketColors>('fb-socket-colors');

/**
 * Keyed map used throughout the engine. The index signature is `string` because
 * the same shape is keyed both by numeric ids (nodes, sockets, connections) and
 * by node-type names (the type registry); TypeScript permits numeric lookups on
 * a string index signature, but not the reverse.
 */
export interface FbKeyValues<T> {
  [key: string]: T;
}

/** A worker is registered as a class and instantiated by the engine. */
export type FbNodeWorkerCtor = new (config?: any, sockets?: XxlSocket[]) => FbNodeWorker;

export interface FbNodeSettings {
  title: string;
  config?: any;
  sockets?: XxlSocket[];
  isFlow?: boolean;
}

export interface FbNodeType {
  component: Type<unknown>;
  settings: FbNodeSettings;
  type?: string;
  /** Absent for composite ("flow") types, which get the built-in FlowWorker. */
  worker?: FbNodeWorkerCtor;
}

export type FbNodeTypes = FbKeyValues<FbNodeType>;

export interface FbNodeHelpers {
  resetSockets(node: FbNodeState): void;

  connect(outSocket: XxlSocket, inSocket: XxlSocket, fromNode: FbNodeState, toNode: FbNodeState): boolean;
}

/** Describes the class doing the actual work. */
export interface FbNodeWorker {
  getStream(socket?: XxlSocket): Observable<any>;

  setStream(stream: Observable<any>, socket: XxlSocket, connection?: XxlConnection): void;

  removeStream(connection?: XxlConnection): void;

  destroy(): void;
}

export interface XxlPosition {
  x: number;
  y: number;
}

export interface XxlFlowUnitState {
  type: string;
  id?: number;
  config?: any;
  title?: string;
  position?: XxlPosition;
  sockets?: XxlSocket[];
}

export interface XxlFlow extends Partial<XxlFlowUnitState> {
  connections: XxlConnection[];
  children: FbNodeState[];
}

export interface FbNodeState {
  type: string;
  id?: number;
  config?: any;
  title?: string;
  position?: XxlPosition;
  sockets?: XxlSocket[];
  connections?: XxlConnection[];
  children?: FbNodeState[];
}

export interface XxlConnection {
  from: number | HTMLElement;
  to: number | HTMLElement;
  in?: number;
  out?: number;
  id: number;
}

export type XxlSocketType = 'in' | 'out';

export interface XxlSocket {
  type: XxlSocketType;
  id?: number;
  color?: string;
  name?: string;
  format?: string | null;
  position?: number;
  description?: string;
  aux?: string;
}

export interface XxlSocketEvent {
  socket: XxlSocket;
  parentId: number;
  scope: number;
  event: PointerEvent;
}

export interface SocketDetails {
  state: XxlSocket;
  element: HTMLElement;
  comp: SocketComponent;
  parentId: number;
  scope: number;
}

export interface ConnectionDetails {
  connection: XxlConnection;
  sockets: { [key: number]: XxlSocket };
}

export interface XxlWorkerService {
  create(id: number, type: string): FbNodeWorker;
}

export type FbSocketColors = Record<string, string>;
