import { Observable } from 'rxjs';

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

export interface FbSize {
  width: number;
  height: number;
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
 * their own internal wiring. It carries no sockets and never enters the graph.
 *
 * This is the one place the core admits the DOM exists, and only structurally —
 * `HTMLElement` is a lib.dom type, not a framework one.
 */
export interface FbElementConnection {
  id: number;
  from: HTMLElement;
  to: HTMLElement;
}

/** Anything a connection renderer can draw. */
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
  /**
   * How much room this node is currently given. Serialised, so a flow reopens
   * looking the way it was left.
   */
  view?: import('./views').FbNodeView;
  /** Prose and figure settings for this node in the document representation. */
  doc?: FbNodeDoc;
  /**
   * How this flow reads as a document. Only meaningful on a flow (a node with
   * children); see `documentFor`, which derives one when this is absent.
   */
  document?: import('./document').FbDocument;
}

/**
 * Per-node documentation. The flow-editor view ignores this; the document view
 * renders it around the node's own visual output.
 */
export interface FbNodeDoc {
  /** Markdown body shown alongside this node's figure. */
  body?: string;
  /** How the node's visual is placed when used as a figure. */
  figure?: {
    float?: 'left' | 'right' | 'none';
    /** Any CSS length, e.g. '320px' or '40%'. */
    width?: string;
    caption?: string;
  };
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
  /**
   * Which of small/normal/full this type can render; see `supportedViews`.
   * Omitted means `['small', 'normal']` — a flow gets all three.
   */
  views?: import('./views').FbNodeView[];
  /**
   * How this type opens when the node's state names no view. Defaults to the
   * smallest supported one — a node at rest is an icon.
   */
  defaultView?: import('./views').FbNodeView;
}

/**
 * A registered node type.
 *
 * `TComponent` is generic because what draws a node is the one thing the core
 * cannot know: an Angular component type, a Lit element tag, or a React
 * component. The Angular package narrows it to `Type<unknown>`.
 */
export interface FbNodeType<TComponent = unknown> {
  component: TComponent;
  settings: FbNodeSettings;
  type?: string;
  /** Absent for composite ("flow") types, which get the built-in FlowWorker. */
  worker?: FbNodeWorkerCtor;
}

export type FbNodeTypes<TComponent = unknown> = FbKeyValues<FbNodeType<TComponent>>;

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

export type FbSocketColors = Record<string, string>;
