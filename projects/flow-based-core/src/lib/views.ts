import { FbNodeSettings, FbNodeState, FbSocketSide } from './types';
import { sideOf } from './geometry';

/**
 * How much room a node is given.
 *
 * `small` is the node at rest — an icon, a reading, a title. `normal` is the
 * node opened up in place, big enough to interact with. `full` is the node with
 * the whole editor surface to itself.
 *
 * This replaces a boolean "is it maximised", which could only ever describe two
 * of the three and left node types conflating "opened" with "opened as far as it
 * goes".
 */
export type FbNodeView = 'small' | 'normal' | 'full';

/** Ordered smallest to largest; the order the view control steps through. */
export const FB_NODE_VIEWS: readonly FbNodeView[] = ['small', 'normal', 'full'] as const;

/**
 * What the two larger views used to be called.
 *
 * `view` is SERIALISED — it is part of the saved flow — so a file written before
 * the rename still says `medium`/`large`, as does any node type declaring its
 * `views` against the old names. Translating on the way in costs one lookup and
 * means neither a saved flow nor a third-party node type has to be rewritten to
 * keep opening the way it was left.
 */
const RENAMED_VIEWS: Readonly<Record<string, FbNodeView>> = { medium: 'normal', large: 'full' };

/** A view name under its current spelling, or `undefined` if it is not one. */
export function normaliseView(view: string | undefined | null): FbNodeView | undefined {
  if (!view) {
    return undefined;
  }

  const renamed = RENAMED_VIEWS[view];

  if (renamed) {
    return renamed;
  }

  return (FB_NODE_VIEWS as readonly string[]).includes(view) ? (view as FbNodeView) : undefined;
}

/**
 * A node type's drawing, one per view.
 *
 * The alternative — one drawing that reads its own view and branches — is what
 * the demo did with `.minified` / `.expanded` classes, and it means every size a
 * node has ever had is in the DOM at once, hidden by CSS. A separate drawing per
 * view is smaller, sizes itself honestly, and makes the absence of one mean
 * something: a view with no drawing is a view the node does not have.
 */
export type FbViewComponents<TComponent> = Partial<Record<FbNodeView, TComponent>>;

/**
 * Whether a type's `component` is a per-view map rather than one drawing.
 *
 * Detected structurally, unlike `nodeMount()`, which is explicit. That is not an
 * inconsistency: telling an Angular component from a mount function means reading
 * private compiled metadata, because both are functions — whereas the view names
 * are a closed set of three, so "an object whose every key is a view name" cannot
 * be anything else. A component type is a function, and `FbMountedNode` has a
 * `mount` key, which is not a view name.
 */
export function isViewComponents<TComponent>(
  component: unknown,
): component is FbViewComponents<TComponent> {
  if (typeof component !== 'object' || component === null) {
    return false;
  }

  const keys = Object.keys(component);

  return keys.length > 0 && keys.every(key => (FB_NODE_VIEWS as readonly string[]).includes(key));
}

/** The drawing for one view: the per-view one, or the single one for all views. */
export function componentFor<TComponent>(
  component: TComponent | FbViewComponents<TComponent> | undefined,
  view: FbNodeView,
): TComponent | undefined {
  if (component === undefined) {
    return undefined;
  }

  return isViewComponents<TComponent>(component) ? component[view] : component;
}

/** The views a per-view map draws, or `undefined` for a single drawing. */
export function componentViews(component: unknown): readonly FbNodeView[] | undefined {
  if (!isViewComponents(component)) {
    return undefined;
  }

  return FB_NODE_VIEWS.filter(view => component[view] !== undefined);
}

/**
 * The views a node type supports, smallest first.
 *
 * Two things narrow it, and both have to agree. A per-view `component` map says
 * which views the type can DRAW — a view it has no drawing for is a view it does
 * not have. `settings.views` says which of those it wants OFFERED, for a type
 * that draws one thing at every size and simply has no use for the room.
 *
 * All three when neither says otherwise. `full` used to be opt-in, on the
 * reasoning that taking the whole surface is a claim only a node's author can
 * make — and the effect was that most nodes had no way to full at all, so the
 * header offered two buttons on one node and three on the next for no reason a
 * user could see.
 */
export function supportedViews(
  settings: FbNodeSettings | undefined,
  component?: unknown,
): readonly FbNodeView[] {
  const drawn = componentViews(component);
  const declared = settings?.views?.length
    ? settings.views.map(view => normaliseView(view))
    : undefined;

  // Filtered out of the canonical order, so the result is in size order however
  // either list was written and stepping through it is predictable.
  const supported = FB_NODE_VIEWS.filter(view =>
    (!drawn || drawn.includes(view)) && (!declared || declared.includes(view)));

  /*
   * Never empty. A type whose two lists do not overlap has said something
   * contradictory, and a node with no views at all cannot be rendered, selected
   * or opened — so it would vanish rather than report the mistake.
   */
  return supported.length ? supported : FB_NODE_VIEWS;
}

/*
 * `component` is optional on all three below, and threaded through to
 * `supportedViews` — it is what tells them which views the type can draw. A
 * caller that has the node's type to hand should pass it; one that only has the
 * settings still gets the right answer for every type that draws one thing.
 */

/**
 * The view a node opens in when its state does not name one.
 *
 * Small unless the type says otherwise. A node at rest should be an icon: a
 * screen of nodes that all opened at their full size would be unreadable, and
 * the editor is about the connections between them at least as much as their
 * contents.
 */
export function defaultView(settings: FbNodeSettings | undefined, component?: unknown): FbNodeView {
  const supported = supportedViews(settings, component);
  const declared = normaliseView(settings?.defaultView);

  return declared && supported.includes(declared) ? declared : supported[0];
}

/** The view a node is in, falling back to its type's default. */
export function viewOf(
  node: FbNodeState,
  settings: FbNodeSettings | undefined,
  component?: unknown,
): FbNodeView {
  const supported = supportedViews(settings, component);
  const stored = normaliseView(node.view);

  return stored && supported.includes(stored) ? stored : defaultView(settings, component);
}

/**
 * The next view up or down, or `null` at the end.
 *
 * Returns null rather than wrapping around. A control that cycles small → full
 * → small gives no clue which way the next press will go, and the icons the
 * shell draws are directional — outward for bigger, inward for smaller.
 */
export function stepView(
  current: FbNodeView,
  direction: 1 | -1,
  settings: FbNodeSettings | undefined,
  component?: unknown,
): FbNodeView | null {
  const supported = supportedViews(settings, component);
  const index = supported.indexOf(current);

  if (index === -1) {
    return supported[0] ?? null;
  }

  return supported[index + direction] ?? null;
}

/**
 * Which child a flow node shows when it is not big enough to show its graph.
 *
 * A subflow still has to look like something at `small` and `normal`, and
 * the honest answer is one of the things it contains. `config.preview` names it;
 * without that it is the first child, so flows written before this existed still
 * show something rather than an empty box.
 */
export function previewChild(node: FbNodeState): FbNodeState | undefined {
  const preferred = node.config?.preview;

  /*
   * Only what the flow was told to show.
   *
   * It used to fall back to `children[0]`, which is whichever node happened to
   * be written first, which for a subflow that fetches something is a config
   * file's contents — a reading nobody wants on the outside of the box. A subflow is a thing
   * with a face, and which face is a decision; unmade, it draws a picture of
   * itself instead.
   */
  if (typeof preferred !== 'number') {
    return undefined;
  }

  return (node.children ?? []).find(child => child.id === preferred);
}

/**
 * Move a socket to a place on one of the node's edges.
 *
 * `sockets` is one flat array holding every edge, and the geometry lays each edge
 * out by position WITHIN that edge — so what matters is only the relative order
 * of the sockets sharing a side. This therefore lifts the socket out, finds the
 * one it should land in front of, and puts it back there: every socket on another
 * edge keeps its place without being touched.
 *
 * `toSide` moves it to a different edge, which is what dragging a dot around the
 * node's outline does. Omitted, it stays where it is and only the order changes.
 *
 * Returns whether anything moved, so a caller can avoid pushing a no-op onto the
 * undo stack.
 */
export function moveSocket(
  node: FbNodeState,
  socketId: number,
  toIndex: number,
  toSide?: FbSocketSide,
): boolean {
  const sockets = node.sockets ?? [];
  const socket = sockets.find(s => s.id === socketId);

  if (!socket) {
    return false;
  }

  const side = toSide ?? sideOf(socket);
  const before = sockets.filter(s => sideOf(s) === side).indexOf(socket);
  const sameSide = side === sideOf(socket);
  const rest = sockets.filter(s => s !== socket);
  const group = rest.filter(s => sideOf(s) === side);
  const to = Math.max(0, Math.min(group.length, toIndex));

  if (sameSide && before === to) {
    return false;
  }

  socket.side = side;

  // Inserted in front of whoever currently holds that place on this edge, or at
  // the end when there is nobody after it.
  const anchor = group[to];
  const at = anchor ? rest.indexOf(anchor) : rest.length;

  rest.splice(at, 0, socket);
  node.sockets = rest;

  return true;
}
