import { StrictMode, useEffect, useState } from 'react';
import { Root, createRoot } from 'react-dom/client';
import { FbNodeApi, FbNodeMount } from '@scaljeri/flow-based-core';

/**
 * A node type written in React, in an editor that has never heard of React.
 *
 * The plain-DOM node type proves the mount contract needs no framework. This
 * proves the harder half: that a real framework's lifecycle fits it — an owned
 * root, asynchronous rendering, its own state — with the editor unaware of any
 * of it. Between them, "a node can ship as its own package" holds whichever
 * framework its author prefers.
 *
 * Everything React-specific stays inside `mount`. The editor sees a function
 * that fills an element and a handle that empties it again.
 */
function Counter({ api }: { api: FbNodeApi }) {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTicks(n => n + 1), 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="react-node">
      <div className="react-node-title">{api.state.title ?? 'React'}</div>
      <div className="react-node-ticks">{ticks}</div>
      <div className="react-node-hint">seconds mounted</div>
    </div>
  );
}

export const reactNode: FbNodeMount = (host, { api }) => {
  const root: Root = createRoot(host);

  root.render(
    <StrictMode>
      <Counter api={api} />
    </StrictMode>,
  );

  return {
    destroy() {
      /*
       * Synchronous, and it has to be.
       *
       * Deferring this to a microtask — to dodge React's "cannot unmount while
       * rendering" warning — put the unmount AFTER the shell had already cleared
       * the host, so React tried to remove children that were no longer there and
       * threw. `destroy()` is called from a Lit update, never from a React
       * render, so there is nothing to dodge.
       */
      root.unmount();
    },
  };
};
