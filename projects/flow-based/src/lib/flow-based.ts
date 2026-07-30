import { InjectionToken, Type } from '@angular/core';
import {
  FbNodeHelpers,
  FbNodeState,
  FbNodeType,
  FbNodeTypes as FbCoreNodeTypes,
  FbSocket,
  FbSocketColors,
} from '@scaljeri/flow-based-core';
// Type-only: SocketComponent imports this module back, and an emitted import
// would create a cycle the AOT compiler rejects (NG3003).
import type { SocketComponent } from './socket/socket.component';

/*
 * Everything framework-agnostic now lives in @scaljeri/flow-based-core: the node
 * and connection model, the engine, propagation, serialisation and the worker
 * contract. It is re-exported here so `@scaljeri/flow-based` stays a single
 * import for Angular consumers.
 *
 * What remains below is the part that genuinely needs Angular — injection tokens
 * — plus the view-layer shapes that reference a component instance.
 */
export * from '@scaljeri/flow-based-core';

/* ==========================================================================
   Angular-specific narrowing
   ========================================================================== */

/** In an Angular app a node type is drawn by an Angular component. */
export type FbAngularNodeType = FbNodeType<Type<unknown>>;
export type FbNodeTypes = FbCoreNodeTypes<Type<unknown>>;

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

/* ==========================================================================
   Deprecated aliases
   --------------------------------------------------------------------------
   The library was mid-rename from Xxl* to Fb* and shipped both. These keep
   0.0.x consumers compiling; they will be removed in a future release.
   ========================================================================== */

/** @deprecated Use {@link FB_NODE_TYPES}. */
export const XXL_FLOW_TYPES = FB_NODE_TYPES;

/** @deprecated Use `FbPosition` from @scaljeri/flow-based-core. */
export type XxlPosition = import('@scaljeri/flow-based-core').FbPosition;

/** @deprecated Use `FbSocket`. */
export type XxlSocket = FbSocket;

/** @deprecated Use `FbSocketType`. */
export type XxlSocketType = import('@scaljeri/flow-based-core').FbSocketType;

/** @deprecated Use {@link FbSocketEvent}. */
export type XxlSocketEvent = FbSocketEvent;

/** @deprecated Use {@link FbSocketDetails}. */
export type SocketDetails = FbSocketDetails;

/** @deprecated Use `FbConnection`, or `FbElementConnection` for element lines. */
export type XxlConnection = import('@scaljeri/flow-based-core').FbConnection;

/** @deprecated Use {@link FbNodeState}; it is the same shape, recursively. */
export type XxlFlowUnitState = FbNodeState;

/** @deprecated Use {@link FbNodeState}. */
export type XxlFlow = FbNodeState;
