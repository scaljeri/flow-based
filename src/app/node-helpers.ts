import { FbNodeState, XxlConnection, XxlFlow, XxlFlowUnitState, XxlSocket } from 'flow-based';

// Only reset socket which do not have initially a format
export const NODE_HELPERS = {
  resetSockets(node: FbNodeState) {
    if (node.type === 'tap') {
      node.sockets.forEach(s => s.format = null);
    }
  },

  connect(outSocket: XxlSocket, inSocket: XxlSocket, fromNode: FbNodeState, toNode: FbNodeState): boolean {
    let didChange = false;

    // TODO: Get format from tab -> flow

    if (fromNode.type === 'tap') {
      if (!outSocket.format && inSocket.format) {
        fromNode.sockets.forEach(s => s.format = inSocket.format);
        didChange = true;
      }
    } else if (toNode.type === 'tap') {
      if (!inSocket.format && outSocket.format) {
        toNode.sockets.forEach(s => s.format = outSocket.format);
        didChange = true;
      } else {
        if (!outSocket.format && inSocket.format) {
          outSocket.format = inSocket.format;
          didChange = true;
        } else if (!inSocket.format && outSocket.format) {
          inSocket.format = outSocket.format;
          didChange = true;
        }
      }

      return didChange;
    }
  }
};
