import { FbNodeEventCallback } from './node-events';
import { FbNodeView } from './views';
import { FbNodeState, FbNodeWorker, FbSocket } from './types';

/**
 * What a node's content can ask of the editor around it.
 *
 * This is the framework-agnostic replacement for injecting `NodeService`: an
 * Angular node gets a `NodeService` backed by one of these, a Lit node gets it
 * directly, and a node shipped as its own npm package needs nothing but this
 * interface.
 */
export interface FbNodeApi {
  /** The node's own state — the same object the editor holds, not a copy. */
  readonly state: FbNodeState;

  /** The worker computing this node, if its type declares one. */
  readonly worker: FbNodeWorker | undefined;

  /** How much room this node has: small, normal or full. */
  readonly view: FbNodeView;

  /** The views this node's type can render, smallest first. */
  readonly supportedViews: readonly FbNodeView[];

  /** Ask for a view. Ignored if the type does not support it. */
  setView(view: FbNodeView): void;

  /**
   * Called when the view changed, however it changed. Returns an unsubscribe.
   *
   * Content needs this because the view is no longer something content asks for
   * and therefore already knows about: the shell's own header steps it, so a
   * node type that draws differently when open only finds out if it is told.
   */
  onViewChange(listener: (view: FbNodeView) => void): () => void;

  /**
   * @deprecated Use {@link setView}. `true` means the largest supported view and
   * `false` the smallest, which is what a boolean could express.
   */
  setMaxSize(isMax: boolean): void;

  /** @deprecated Use {@link view}. True for anything above `small`. */
  isMaxSize(): boolean;

  /** Show or hide the shell's title, for content that draws its own. */
  setLabelVisible(visible: boolean): void;

  /** Remove this node from the flow. */
  deleteSelf(): void;

  addSocket(socket: FbSocket): void;

  removeSocket(socket: FbSocket): void;

  /**
   * The shell's dot for one of this node's sockets.
   *
   * Content that wires itself to its own sockets — an editor showing which input
   * feeds which field — needs to point at something, and the dot belongs to the
   * shell. Returns `undefined` before the socket is rendered.
   */
  socketElement(socketId: number): HTMLElement | undefined;

  /** Re-measure after the content changed size in a way ResizeObserver misses. */
  calibrate(): void;

  /** Listen for framework events addressed to this node (`blur`, and so on). */
  register(callback: FbNodeEventCallback, type?: string): void;

  unregister(type?: string): void;

  /** Drop every listener this node registered. */
  unregisterAll(): void;

  /** Called when this node is clicked. Returns an unsubscribe function. */
  onClick(listener: (event: PointerEvent) => void): () => void;

  /**
   * Draw a line between two elements *inside* this node, and return its id.
   *
   * These are the node's own decoration, not graph edges: they never enter the
   * Flow, are never serialised, and connect DOM elements rather than sockets.
   * The shell draws them because it owns the layer that can sit above the
   * content without the content having to manage an SVG of its own.
   */
  wire(from: Element, to: Element): number;

  unwire(id: number): void;

  clearWiring(): void;

  /** Redraw the wiring after the content moved something. */
  refreshWiring(): void;
}

export interface FbNodeContext {
  api: FbNodeApi;
}

/**
 * A live node-content instance. Returned by {@link FbNodeMount} so the editor can
 * tear it down when the node goes away.
 */
export interface FbNodeHandle {
  /** Optional: called when the node's state changed underneath the content. */
  update?(): void;

  /**
   * Optional: this node type's own settings, for the shell's settings panel.
   *
   * The panel already edits what every node has — title, sockets, colours —
   * because that is model. Anything beyond it belongs to the type: which fractal
   * to draw, what range to generate. Contributing it here keeps one panel and one
   * way in, instead of every node type growing a config screen of its own.
   *
   * Return a teardown function if there is anything to release.
   */
  mountSettings?(host: HTMLElement): (() => void) | void;

  destroy(): void;
}

/**
 * How a node type renders its content.
 *
 * The one thing the core genuinely cannot know is what draws a node, so it asks
 * for a function instead of a component: given a host element and a handle back
 * to the editor, mount something and return how to unmount it.
 *
 * That is deliberately the smallest possible contract. An Angular adapter boots a
 * component into `host`; a Lit node calls `render()` into it; a React node calls
 * `createRoot(host)`. It is also what lets node types ship as their own npm
 * packages without depending on the editor's framework.
 */
export type FbNodeMount = (host: HTMLElement, context: FbNodeContext) => FbNodeHandle;
