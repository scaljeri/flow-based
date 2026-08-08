import { IdGenerator } from './id-generator';
import { FbConnection, FbNodeState, FbPosition } from './types';
import { positionOf, setPosition } from './ui';

/**
 * A copied piece of a flow: some nodes, and the connections between them.
 *
 * Deliberately a plain object with no live references into the flow it came
 * from — it is a deep clone, so pasting twice yields two independent subgraphs
 * and copying then deleting the original still works.
 */
export interface FbClipboard {
  nodes: FbNodeState[];
  connections: FbConnection[];
}

/**
 * Copy a set of nodes out of a flow.
 *
 * Only connections with BOTH ends inside the selection come along. A connection
 * to a node that was not copied has nowhere to land on paste, and silently
 * reattaching it to the original would make paste destructive.
 */
export function copyNodes(flow: FbNodeState, nodeIds: Iterable<number>): FbClipboard {
  const wanted = new Set(nodeIds);
  const nodes = (flow.children ?? []).filter(node => node.id !== undefined && wanted.has(node.id));
  const present = new Set(nodes.map(node => node.id));

  const connections = (flow.connections ?? []).filter(
    connection => present.has(connection.from) && present.has(connection.to),
  );

  return {
    nodes: structuredClone(nodes),
    connections: structuredClone(connections),
  };
}

/**
 * Paste a clipboard into a flow, offset so it does not land exactly on top of
 * what it was copied from.
 *
 * Every id is reissued — nodes, sockets and connections — and the connections
 * are rewritten to point at the new ones. Reusing ids would produce a flow with
 * duplicates, where "the node with id 7" is ambiguous and the engine's lookups
 * return whichever it finds first.
 *
 * Returns the new nodes, so a caller can select what it just pasted.
 */
export function pasteNodes(
  flow: FbNodeState,
  clipboard: FbClipboard,
  ids: IdGenerator,
  offset: FbPosition = { x: 2, y: 2 },
): FbNodeState[] {
  const nodeIds = new Map<number, number>();
  const socketIds = new Map<number, number>();

  /*
   * Two passes over the WHOLE tree, because a pasted subflow is a tree: its
   * children have children, and its inner connections reference sockets at two
   * levels (a bridge connection names the subflow's OWN socket from the
   * inside). Reissuing one level deep — which is what this did — pasted a
   * subflow whose entire inside still carried the original ids, so the
   * document held duplicates and "the node with id 7" meant two things.
   *
   * Pass one issues every id so the maps are complete; pass two rewrites the
   * connections, which may point at ids issued anywhere in the tree.
   */
  const reissueIds = (node: FbNodeState): void => {
    nodeIds.set(node.id!, node.id = ids.create());

    node.sockets = (node.sockets ?? []).map(socket => {
      const id = ids.create();

      socketIds.set(socket.id!, id);

      return { ...socket, id };
    });

    (node.children ?? []).forEach(reissueIds);
  };

  const rewireConnections = (node: FbNodeState): void => {
    /*
     * Only rewritten where it exists: the engine reads the PRESENCE of a
     * `connections` array as "this node is a flow" and then recurses into its
     * children. Materialising an empty one on a leaf node here made every
     * pasted node claim to be a flow, and the engine fell over the children it
     * then expected.
     */
    if (!node.connections) {
      (node.children ?? []).forEach(rewireConnections);

      return;
    }

    node.connections = node.connections
      .map(connection => ({
        ...connection,
        id: ids.create(),
        from: nodeIds.get(connection.from)!,
        to: nodeIds.get(connection.to)!,
        out: socketIds.get(connection.out!)!,
        in: socketIds.get(connection.in!)!,
      }))
      // A clipboard from an older flow could name sockets that no longer exist;
      // dropping those beats pasting a connection to nothing.
      .filter(connection => connection.out !== undefined && connection.in !== undefined);

    (node.children ?? []).forEach(rewireConnections);
  };

  const nodes = structuredClone(clipboard.nodes).map(node => {
    reissueIds(node);

    setPosition(node, {
      x: positionOf(node).x + offset.x,
      y: positionOf(node).y + offset.y,
    });

    return node;
  });

  nodes.forEach(rewireConnections);

  const connections = structuredClone(clipboard.connections)
    .map(connection => ({
      ...connection,
      id: ids.create(),
      from: nodeIds.get(connection.from)!,
      to: nodeIds.get(connection.to)!,
      out: socketIds.get(connection.out!)!,
      in: socketIds.get(connection.in!)!,
    }))
    .filter(connection => connection.out !== undefined && connection.in !== undefined);

  flow.children = [...(flow.children ?? []), ...nodes];
  flow.connections = [...(flow.connections ?? []), ...connections];

  return nodes;
}

/** How nodes can be lined up. */
export type FbAlignment = 'left' | 'right' | 'top' | 'bottom' | 'centre-x' | 'centre-y';

/**
 * Line up nodes on one edge.
 *
 * Positions are percentages of the plane, and this aligns on those rather than
 * on rendered pixels: nodes are different sizes, so aligning their left EDGES in
 * pixels and aligning their positions are different operations. The position is
 * what the JSON stores and what a reader would expect to become equal.
 */
export function alignNodes(nodes: FbNodeState[], alignment: FbAlignment): void {
  if (nodes.length < 2) {
    return;
  }

  const xs = nodes.map(node => positionOf(node).x);
  const ys = nodes.map(node => positionOf(node).y);

  const target = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    'centre-x': xs.reduce((a, b) => a + b, 0) / xs.length,
    'centre-y': ys.reduce((a, b) => a + b, 0) / ys.length,
  }[alignment];

  const axis = alignment === 'top' || alignment === 'bottom' || alignment === 'centre-y' ? 'y' : 'x';

  for (const node of nodes) {
    setPosition(node, { ...positionOf(node), [axis]: target } as FbPosition);
  }
}

/**
 * Space nodes evenly between the two outermost, along one axis.
 *
 * The endpoints stay put — distributing is about the gaps between things, and
 * moving the ends would move the whole group.
 */
export function distributeNodes(nodes: FbNodeState[], axis: 'x' | 'y'): void {
  if (nodes.length < 3) {
    return;
  }

  const sorted = [...nodes].sort((a, b) => positionOf(a)[axis] - positionOf(b)[axis]);
  const first = positionOf(sorted[0])[axis];
  const last = positionOf(sorted[sorted.length - 1])[axis];
  const step = (last - first) / (sorted.length - 1);

  sorted.forEach((node, index) => {
    setPosition(node, { ...positionOf(node), [axis]: first + step * index } as FbPosition);
  });
}
