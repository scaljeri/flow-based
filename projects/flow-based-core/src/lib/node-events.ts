/**
 * Events addressed to node content, rather than to the graph.
 *
 * A node type registers a listener ("tell me when the user clicks outside") and
 * the shell triggers it. This is deliberately separate from `Flow.changes`: that
 * describes what happened to the *graph*, whereas these are messages between the
 * shell and whatever a node type happens to render.
 *
 * Listeners are a stack per type, and only the top one is invoked. That is what
 * lets a node open a panel, take over the next "outside click", and hand control
 * back to whoever had it before — returning falsy from the callback pops it.
 */
export type FbNodeEventCallback = (payload?: unknown) => boolean | void;

interface Registration {
  nodeId: number;
  callback: FbNodeEventCallback;
}

export const FB_DEFAULT_EVENT = '__default__';

export class FbNodeEvents {
  private readonly stacks = new Map<string, Registration[]>();

  register(nodeId: number, callback: FbNodeEventCallback, type = FB_DEFAULT_EVENT): void {
    const stack = this.stacks.get(type) ?? [];

    stack.unshift({ nodeId, callback });
    this.stacks.set(type, stack);
  }

  unregister(nodeId: number, type = FB_DEFAULT_EVENT): void {
    const stack = this.stacks.get(type);

    if (stack) {
      this.stacks.set(type, stack.filter(entry => entry.nodeId !== nodeId));
    }
  }

  /** Drop every listener a node registered — call this when it is destroyed. */
  unregisterAll(nodeId: number): void {
    for (const type of [...this.stacks.keys()]) {
      this.unregister(nodeId, type);
    }
  }

  /** Invoke the top listener for `type`, popping it unless it returns truthy. */
  trigger(type: string, payload?: unknown): void {
    const stack = this.stacks.get(type);

    if (!stack || stack.length === 0) {
      return;
    }

    if (!stack[0].callback(payload)) {
      stack.shift();
    }
  }

  clear(): void {
    this.stacks.clear();
  }
}
