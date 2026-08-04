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

/**
 * Which edge of the node a socket sits on.
 *
 * Separate from `type`, which says which WAY the data goes. The two were the
 * same thing while every input was on the left and every output on the right,
 * and that is only a default: a node whose inputs arrive from above reads better
 * with them on top, and nothing about the engine cares.
 */
export type FbSocketSide = 'top' | 'right' | 'bottom' | 'left';

export interface FbSocket {
  type: FbSocketType;
  id?: number;
  color?: string;
  name?: string;
  /** The data type carried by this socket. `null` means "not yet negotiated". */
  format?: string | null;
  /**
   * The types this socket MAY carry, for one that accepts more than one.
   *
   * `format` is what it has; this is what it is allowed to have. Absent or empty
   * means the single `format`, or anything when there is none either — which is
   * what every flow saved before this existed says. See `formatsOf`.
   */
  formats?: string[];
  /**
   * Which edge this socket sits on. Absent means the default for its `type` —
   * `in` on the left, `out` on the right — which is what every flow saved before
   * this existed means, and what a node type that does not care still gets.
   */
  side?: FbSocketSide;
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
  /**
   * Which palette group this type is listed under. Absent means the general
   * list. A group is presentation — nothing in the engine reads it — but it
   * lives here because the palette's only knowledge of a type IS its settings.
   */
  group?: string;
  config?: any;
  sockets?: FbSocket[];
  isFlow?: boolean;
  /**
   * Which of small/normal/full this type wants offered; see `supportedViews`.
   *
   * Omitted means all three. A type that draws a different component per view
   * has usually said this already, by not supplying one — this is for a type
   * that draws the same thing at every size and simply has no use for the room.
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
  /**
   * What draws this node: one drawing for every view, or one per view.
   *
   * A per-view map is the more honest form — each view sizes itself, and a view
   * with no entry is a view the node does not have. See `FbViewComponents`.
   */
  component: TComponent | import('./views').FbViewComponents<TComponent>;
  /**
   * What draws this type's OWN settings, inside the shell's settings panel.
   *
   * Title and sockets are model and the panel edits them for every node; this is
   * the part only a type knows — which fractal to draw, what range to generate.
   * Keeping it in the panel rather than in the node means a node at rest stays an
   * icon, and there is one place to configure anything rather than a config
   * screen per node type.
   *
   * A framework-free type can skip this and return `mountSettings` on its handle
   * instead; this is how a type declares one when its drawing is a component and
   * the adapter has to build it.
   */
  settingsComponent?: TComponent;
  settings: FbNodeSettings;
  type?: string;
  /** Absent for subflow ("flow") types, which get the built-in FlowWorker. */
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
