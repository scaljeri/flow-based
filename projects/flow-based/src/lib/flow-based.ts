import { InjectionToken, Type } from '@angular/core';
import {
  FbNodeHelpers,
  FbNodeMount,
  FbNodeState,
  FbNodeType,
  FbNodeTypes as FbCoreNodeTypes,
  FbSocket,
  FbSocketColors,
} from '@scaljeri/flow-based-core';

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

/**
 * A node type is drawn by an Angular component, or by anything at all.
 *
 * The second option is the point of the mount contract: a node needs an editor,
 * not a framework. `nodeMount()` wraps a plain FbNodeMount so it can sit in the
 * same registry as Angular components — and wraps it EXPLICITLY rather than
 * having the adapter guess, because an Angular component and a mount function
 * are both just functions and telling them apart means reading Angular's private
 * compiled metadata.
 */
export interface FbMountedNode {
  readonly mount: FbNodeMount;
}

export function nodeMount(mount: FbNodeMount): FbMountedNode {
  return { mount };
}

export function isMountedNode(component: unknown): component is FbMountedNode {
  return typeof component === 'object' && component !== null && 'mount' in component;
}

export type FbNodeComponent = Type<unknown> | FbMountedNode;

export type FbAngularNodeType = FbNodeType<FbNodeComponent>;
export type FbNodeTypes = FbCoreNodeTypes<FbNodeComponent>;

/* ==========================================================================
   Injection tokens
   ========================================================================== */

/** The node-type registry: maps a node `type` string to its component + worker. */
export const FB_NODE_TYPES = new InjectionToken<FbNodeTypes>('fb-node-types');

/**
 * How type names relate — whether an offered type satisfies a demanded one.
 * Provided by an app that keeps a refinement registry; absent, the editor
 * compares names, which is what every flow before refinements expects.
 */
export const FB_TYPE_ASSIGNABILITY =
  new InjectionToken<import('@scaljeri/flow-based-core').FbAssignable>('fb-type-assignability');

/**
 * What a format name MEANS, for the bar that names a pressed socket.
 *
 * The shell knows a socket's format as a name; the book of what those names
 * mean belongs to whatever assembled the modules. An app with a registry
 * provides this; without it a socket still says what it carries.
 */
export const FB_FORMAT_INFO =
  new InjectionToken<import('@scaljeri/flow-based-core').FbFormatLookup>('fb-format-info');

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

/**
 * Where a socket is drawn, plus which node it belongs to.
 *
 * `element` is the shell's socket dot — a plain element rather than a component
 * instance, which is what it became once socket positions were computed from the
 * graph instead of measured from the DOM. Nothing needs to find a component any
 * more, so the whole socket registry went with it.
 */
export interface FbSocketDetails {
  state: FbSocket;
  element: HTMLElement;
  parentId: number;
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
