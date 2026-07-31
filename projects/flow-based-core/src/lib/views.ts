import { FbNodeSettings, FbNodeState } from './types';

/**
 * How much room a node is given.
 *
 * `small` is the node at rest — an icon, a reading, a title. `medium` is the
 * node opened up in place, big enough to interact with. `large` is the node with
 * the whole editor surface to itself.
 *
 * This replaces a boolean "is it maximised", which could only ever describe two
 * of the three and left node types conflating "opened" with "opened as far as it
 * goes".
 */
export type FbNodeView = 'small' | 'medium' | 'large';

/** Ordered smallest to largest; the order the view control steps through. */
export const FB_NODE_VIEWS: readonly FbNodeView[] = ['small', 'medium', 'large'] as const;

/**
 * The views a node type supports, smallest first.
 *
 * Defaults to `['small', 'medium']`, which is exactly what every node could do
 * before this existed — collapsed and expanded. A type opts into `large` rather
 * than inheriting it, because taking the whole surface is a claim only the node's
 * author can make: a node that renders a single number has nothing to do with the
 * extra room.
 *
 * A flow node is the exception and gets all three by default: its `large` view is
 * its own graph, which it always has.
 */
export function supportedViews(settings: FbNodeSettings | undefined): readonly FbNodeView[] {
  const declared = settings?.views;

  if (declared?.length) {
    // Kept in size order however they were written, so stepping is predictable.
    return FB_NODE_VIEWS.filter(view => declared.includes(view));
  }

  return settings?.isFlow ? FB_NODE_VIEWS : ['small', 'medium'];
}

/** The view a node is in, falling back to the smallest one it supports. */
export function viewOf(node: FbNodeState, settings: FbNodeSettings | undefined): FbNodeView {
  const supported = supportedViews(settings);

  return node.view && supported.includes(node.view) ? node.view : supported[0];
}

/**
 * The next view up or down, or `null` at the end.
 *
 * Returns null rather than wrapping around. A control that cycles small → large
 * → small gives no clue which way the next press will go, and the icons the
 * shell draws are directional — outward for bigger, inward for smaller.
 */
export function stepView(
  current: FbNodeView,
  direction: 1 | -1,
  settings: FbNodeSettings | undefined,
): FbNodeView | null {
  const supported = supportedViews(settings);
  const index = supported.indexOf(current);

  if (index === -1) {
    return supported[0] ?? null;
  }

  return supported[index + direction] ?? null;
}

/**
 * Which child a flow node shows when it is not large enough to show its graph.
 *
 * A composite node still has to look like something at `small` and `medium`, and
 * the honest answer is one of the things it contains. `config.preview` names it;
 * without that it is the first child, so flows written before this existed still
 * show something rather than an empty box.
 */
export function previewChild(node: FbNodeState): FbNodeState | undefined {
  const children = node.children ?? [];
  const preferred = node.config?.preview;

  if (typeof preferred === 'number') {
    const match = children.find(child => child.id === preferred);

    if (match) {
      return match;
    }
  }

  return children[0];
}
