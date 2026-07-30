import { InjectionToken, Type } from '@angular/core';
import { Observable } from 'rxjs';
// Type-only: SocketComponent imports this module back, and an emitted import
// would create a cycle the AOT compiler rejects (NG3003).
import type { SocketComponent } from './socket/socket.component';

/* ==========================================================================
   Injection tokens
   ========================================================================== */

/** The node-type registry: maps a node `type` string to its component + worker. */
export const FB_NODE_TYPES = new InjectionToken<FbNodeTypes>('fb-node-types');

/** Optional hooks letting an app customise socket-format negotiation. */
export const FB_NODE_HELPERS = new InjectionToken<FbNodeHelpers>('fb-node-helpers');

/** Optional map from socket `format` to the colour its connections are drawn in. */
export const FB_SOCKET_COLORS = new InjectionToken<FbSocketColors>('fb-socket-colors');

/* ==========================================================================
   Core shapes
   ========================================================================== */

/**
 * Keyed map used throughout the engine. The index signature is `string` because
 * the same shape is keyed both by numeric ids (nodes, sockets, connections) and
 * by node-type names (the type registry); TypeScript permits numeric lookups on
 * a string index signature, but not the reverse.
 */
export interface FbKeyValues<T> {
  [key: string]: T;
}

export interface FbPosition {
  x: number;
  y: number;
}

export type FbSocketType = 'in' | 'out';

export interface FbSocket {
  type: FbSocketType;
  id?: number;
  color?: string;
  name?: string;
  /** The data type carried by this socket. `null` means "not yet negotiated". */
  format?: string | null;
  position?: number;
  description?: string;
  aux?: string;
}

/**
 * A connection between two sockets on two nodes — the graph's edge type, and the
 * only kind the engine knows about.
 */
export interface FbConnection {
  id: number;
  from: number;
  to: number;
  in?: number;
  out?: number;
}

/**
 * A line drawn directly between two DOM elements, used by node types that render
 * their own internal wiring (see `NodeService.addConnection`). It carries no
 * sockets and never enters the graph.
 *
 * This used to be the same type as {@link FbConnection}, whose `from`/`to` were
 * `number | HTMLElement` — a union of a domain id and a DOM node in one field,
 * forcing casts throughout the engine (docs/AUDIT.md §3.9).
 */
export interface FbElementConnection {
  id: number;
  from: HTMLElement;
  to: HTMLElement;
}

/** Anything the connection renderer can draw. */
export type FbAnyConnection = FbConnection | FbElementConnection;

export function isElementConnection(connection: FbAnyConnection): connection is FbElementConnection {
  return typeof connection.from === 'object';
}

/**
 * The recursive node shape, and the whole persisted format: a flow is just a node
 * that has `children` and `connections`. This is what gets exported as JSON.
 */
export interface FbNodeState {
  type: string;
  id?: number;
  config?: any;
  title?: string;
  position?: FbPosition;
  sockets?: FbSocket[];
  connections?: FbConnection[];
  children?: FbNodeState[];
}

/* ==========================================================================
   Node types and workers
   ========================================================================== */

/** A worker is registered as a class and instantiated by the engine. */
export type FbNodeWorkerCtor = new (config?: any, sockets?: FbSocket[]) => FbNodeWorker;

export interface FbNodeSettings {
  title: string;
  config?: any;
  sockets?: FbSocket[];
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

  connect(outSocket: FbSocket, inSocket: FbSocket, fromNode: FbNodeState, toNode: FbNodeState): boolean;
}

/** Describes the class doing the actual work. */
export interface FbNodeWorker {
  getStream(socket?: FbSocket): Observable<any>;

  setStream(stream: Observable<any>, socket: FbSocket, connection?: FbConnection): void;

  removeStream(connection?: FbConnection): void;

  destroy(): void;
}

/* ==========================================================================
   View-layer shapes
   ========================================================================== */

export interface FbSocketEvent {
  socket: FbSocket;
  parentId: number;
  scope: number;
  event: PointerEvent;
}

/** A registered socket component, plus where it sits in the graph. */
export interface FbSocketDetails {
  state: FbSocket;
  element: HTMLElement;
  comp: SocketComponent;
  parentId: number;
  scope: number;
}

export type FbSocketColors = Record<string, string>;

/* ==========================================================================
   Deprecated aliases
   --------------------------------------------------------------------------
   The library was mid-rename from Xxl* to Fb* and shipped both. These keep
   0.0.x consumers compiling; they will be removed in a future release.
   ========================================================================== */

/** @deprecated Use {@link FB_NODE_TYPES}. */
export const XXL_FLOW_TYPES = FB_NODE_TYPES;

/** @deprecated Use {@link FbPosition}. */
export type XxlPosition = FbPosition;

/** @deprecated Use {@link FbSocket}. */
export type XxlSocket = FbSocket;

/** @deprecated Use {@link FbSocketType}. */
export type XxlSocketType = FbSocketType;

/** @deprecated Use {@link FbSocketEvent}. */
export type XxlSocketEvent = FbSocketEvent;

/** @deprecated Use {@link FbSocketDetails}. */
export type SocketDetails = FbSocketDetails;

/**
 * @deprecated Use {@link FbConnection} for graph edges, or
 * {@link FbElementConnection} for element-to-element lines.
 */
export type XxlConnection = FbConnection;

/** @deprecated Use {@link FbNodeState}; it is the same shape, recursively. */
export type XxlFlowUnitState = FbNodeState;

/** @deprecated Use {@link FbNodeState}. */
export type XxlFlow = FbNodeState;
