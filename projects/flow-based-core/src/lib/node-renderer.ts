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

  /** Expand or collapse this node. */
  setMaxSize(isMax: boolean): void;

  /** Remove this node from the flow. */
  deleteSelf(): void;

  addSocket(socket: FbSocket): void;

  removeSocket(socket: FbSocket): void;

  /** Re-measure after the content changed size in a way ResizeObserver misses. */
  calibrate(): void;

  /** Listen for framework events addressed to this node (`blur`, and so on). */
  register(callback: (payload?: any) => boolean | void, type?: string): void;

  unregister(type?: string): void;
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
