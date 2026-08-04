import { FbNodeState, FbSocket } from '@scaljeri/flow-based';

/**
 * The demo's one format rule: a tap is format-transparent.
 *
 * Whatever flows through any of a tap's sockets is what ALL of its sockets
 * carry — that is what makes it a tap. Everything else — settling the two ends
 * of a connection on a common format — is the engine's job, and repeating it
 * here is how the two drift apart.
 */
export const NODE_HELPERS = {
  resetSockets(node: FbNodeState) {
    if (node.type === 'tap') {
      node.sockets!.forEach(s => delete s.format);
    }
  },

  connect(outSocket: FbSocket, inSocket: FbSocket, fromNode: FbNodeState, toNode: FbNodeState): boolean {
    let didChange = false;

    /*
     * Only the TAP's own sockets are stamped. This used to write to the other
     * node's whole socket array as well, which overwrote declared formats on
     * sockets that had nothing to do with this connection — and did it with
     * didChange still false, so the propagation worklist never heard about it
     * and downstream lines kept their stale colours.
     */
    if (fromNode.type === 'tap' && !outSocket.format && inSocket.format) {
      fromNode.sockets!.forEach(s => s.format = inSocket.format);
      didChange = true;
    }

    if (toNode.type === 'tap' && !inSocket.format && outSocket.format) {
      toNode.sockets!.forEach(s => s.format = outSocket.format);
      didChange = true;
    }

    return didChange;
  }
};
