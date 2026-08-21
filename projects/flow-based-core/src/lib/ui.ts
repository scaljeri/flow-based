import { FbNodeState, FbNodeUi, FbPosition } from './types';

/**
 * Reading and writing the part of a node that is about looking at it.
 *
 * Small functions rather than a bare `node.ui.position` everywhere, for one
 * reason: `ui` is optional, so every reader would otherwise carry the same
 * two `??` and every writer the same `??=`. Named, the intent survives — and
 * a flow saved before the split had these fields at the top of the node, so
 * there is exactly one place to look when that has to be read again.
 */
export function uiOf(node: FbNodeState): FbNodeUi {
  // A hand-edited flow can carry `ui: "left"` or `ui: 5`; `??=` leaves a
  // non-null non-object in place, and the next `.position =` threw or silently
  // dropped the edit. Replace anything that is not a plain object.
  if (!node.ui || typeof node.ui !== 'object') {
    node.ui = {};
  }

  return node.ui;
}

/**
 * Where a node sits, in percentages of the plane.
 *
 * The origin for one that has never been placed. A node with no position is a
 * node the editor is about to place, and answering `undefined` only moves the
 * decision to the caller — every one of which would answer the same thing.
 */
export function positionOf(node: FbNodeState): FbPosition {
  const p = node.ui?.position;
  // Coerced to finite numbers: a non-object position, or a NaN coordinate,
  // otherwise flowed into the drag maths and was written back into the file.
  const x = typeof p?.x === 'number' && Number.isFinite(p.x) ? p.x : 0;
  const y = typeof p?.y === 'number' && Number.isFinite(p.y) ? p.y : 0;

  return { x, y };
}

export function setPosition(node: FbNodeState, position: FbPosition): void {
  uiOf(node).position = position;
}

/** The size the reader dragged this node to, if they dragged one. */
export function sizeOf(node: FbNodeState): { width: number; height: number } | undefined {
  return node.ui?.size;
}

export function setSize(node: FbNodeState, size: { width: number; height: number } | undefined): void {
  if (size) {
    uiOf(node).size = size;
  } else if (node.ui) {
    delete node.ui.size;
  }
}
