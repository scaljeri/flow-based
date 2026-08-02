# Writing a node type

A node type is two things: something that **draws**, and optionally something that
**computes**. Neither needs to know which editor it is inside, and neither needs
Angular.

```ts
{
  component: <how to draw it>,
  settings:  <title, sockets, default config>,
  worker:    <optional: the class that computes>,
}
```

That entry goes in the registry the editor is given — `FB_NODE_TYPES` in Angular,
`FbEditorOptions.types` in the web-component shell.

---

## The mount contract

The core cannot know what draws a node, so it asks for a function rather than a
component:

```ts
type FbNodeMount = (host: HTMLElement, context: { api: FbNodeApi }) => FbNodeHandle;

interface FbNodeHandle {
  update?(): void;   // optional: the node's state changed underneath you
  destroy(): void;   // required: undo whatever mount() did
}
```

Put something in `host`, return how to remove it. That is the whole contract, and
it is deliberately the smallest thing that can work: an Angular adapter boots a
component into `host`, a Lit node renders into it, a React node calls
`createRoot(host)`.

`host` is in the **light DOM**, so ordinary stylesheets reach it — a global CSS
file, a `<style>` tag, a bundler-imported stylesheet all behave normally.

### A complete node, with no framework

See [`src/app/nodes/meter/meter.node.ts`](../src/app/nodes/meter/meter.node.ts)
for the version that runs in the demo. In outline:

```ts
import { FbNodeMount } from '@scaljeri/flow-based-core';

export const meterNode: FbNodeMount = (host, { api }) => {
  const el = document.createElement('div');
  el.className = 'my-meter';
  host.appendChild(el);

  const worker = api.worker as MyWorker | undefined;
  const subscription = worker?.getStream().subscribe(() => {
    el.textContent = String(worker.currentValue);
  });

  return {
    destroy() {
      subscription?.unsubscribe();
      el.remove();
    },
  };
};
```

Registering it in an Angular app:

```ts
import { nodeMount } from '@scaljeri/flow-based';

export const FB_CONFIG = {
  meter: { component: nodeMount(meterNode), settings: METER_SETTINGS, worker: MyWorker },
  // ...alongside Angular components, which need no wrapper
  tap: { component: TapComponent, settings: TAP_SETTINGS, worker: TapWorker },
};
```

`nodeMount()` is explicit on purpose. An Angular component and a mount function
are both functions, and distinguishing them would mean reading Angular's private
compiled metadata — a wrapper says which one you meant.

### As an npm package

A package containing the above depends on `@scaljeri/flow-based-core` **only** —
not on the editor, not on Angular. Publish the mount function and the settings;
the host app decides where they go:

```json
{
  "peerDependencies": { "@scaljeri/flow-based-core": "^0.1.0" }
}
```

---

## What a node can ask of the editor

`FbNodeApi` is the whole of it. In Angular, `NodeService` is a facade over this
same interface, so the two are always in step.

| | |
|---|---|
| `state` | the node's own state — the live object, not a copy |
| `worker` | the worker computing this node, if its type declares one |
| `view` / `supportedViews` | how much room you have: `small`, `normal` or `full` |
| `setView(view)` | ask for one of them |
| `onViewChange(listener)` | the view changed; returns an unsubscribe function |
| `setMaxSize(isMax)` / `isMaxSize()` | deprecated: the largest or smallest supported view |
| `setLabelVisible(visible)` | hide the shell's title if you draw your own |
| `deleteSelf()` | remove this node from the flow |
| `addSocket(socket)` / `removeSocket(socket)` | change the node's sockets at runtime |
| `socketElement(id)` | the shell's dot for one of your sockets |
| `calibrate()` | re-measure, for size changes a ResizeObserver cannot see |
| `register(cb, type)` / `unregister(type)` / `unregisterAll()` | framework events, e.g. `'blur'` |
| `onClick(listener)` | the node was clicked; returns an unsubscribe function |
| `wire(from, to)` / `unwire(id)` / `clearWiring()` / `refreshWiring()` | lines between two of **your own** elements |

Two notes on the last row. Those lines are decoration, not graph edges: they are
never serialised and connect DOM elements rather than sockets. And they are
measured rather than computed, unlike socket positions — the shell can derive a
socket's place from the graph, but it cannot know where two arbitrary elements of
yours ended up.

Event listeners registered with `register()` are a **stack per type**, and only
the top one runs. That is what lets a node open a panel, take the next "click
outside" for itself, and hand control back to whoever had it when it closes.

---

## Settings

```ts
const METER_SETTINGS: FbNodeSettings = {
  title: 'Meter',
  config: {},                                  // deep-cloned per instance
  sockets: [
    { type: 'in',  format: 'number' },
    { type: 'out', format: 'number' },
  ],
};
```

Socket ids are assigned by the editor, so do not write them here. `format` drives
connection validity and colour: sockets only connect when their formats agree, or
when at least one is unset. A socket with no `format` takes one from whatever it
is connected to, and the engine propagates that through the graph.

---

## Views

A node has three sizes, and your type declares which of them it can render:

| | |
|---|---|
| `small` | the node at rest: an icon, a reading, a title, and no chrome at all |
| `normal` | opened in place, with a header bar across the top |
| `full` | the whole editor surface, with zoom and pan suspended |

Every node opens `small`. For a composite (`isFlow: true`), `full` is navigation:
the editor enters its graph rather than the node growing.

### A drawing per view

Register one component per view, and each of them draws — and sizes — one thing:

```ts
const types: FbNodeTypes = {
  meter: {
    component: {
      small:  MeterSmallComponent,
      normal: MeterNormalComponent,
      // no `full`: this node has nothing to do with the whole surface
    },
    settings: METER_SETTINGS,
    worker: MeterWorker,
  },
};
```

**A view with no component is a view the node does not have.** Nothing offers it:
the header draws no button for it, `supportedViews` leaves it out, and
`setView()` ignores it. That is how a type says "I have no use for the room" —
`settings.views` still narrows too, and is for a type that draws one thing at
every size.

**Each component defines its own size.** The shell imposes none: it draws a frame
around whatever comes out, so a small drawing can be forty pixels wide and a
normal one three hundred. At `full` the drawing is handed the surface, and
`width: 100%` / `height: 100%` fill it.

One component for the whole type still works and covers every view:

```ts
fractals: { component: FractalComponent, settings: FRACTALS_SETTINGS },
```

Prefer the map when the sizes genuinely differ. One component branching on
`api.view` means every size a node has is in the DOM at once with all but one
hidden by CSS — which is what this demo used to do, and why its nodes were 500px
wide whether or not you could see them.

**You do not draw the chrome.** The shell does, and it is the same for every node
type: a double-click opens a small node, and the header of an open one carries
the title, a settings button, the way back to small and the way out to full.
Deleting is in that settings panel. Drawing your own title bar or close button
gives the user two controls for one fact, which is how they come to disagree.

What you do draw is the *content*, which may differ per view — read `api.view`
when you mount, and subscribe with `api.onViewChange` for the rest. Angular nodes
get the same thing as `NodeService.view$`.

The two larger views used to be called `medium` and `large`. Both spellings are
still read — from a saved flow, or from a `views` array in a package built before
the rename — so nothing has to be rewritten to keep working.

---

## Workers

A worker computes; it never touches the DOM.

```ts
interface FbNodeWorker {
  getStream(socket): Observable<unknown>;
  setStream(stream, socket, connection): void;
  removeStream(connection): void;
  connect(connection, sockets): void;
  destroy(): void;
}
```

`destroy()` really is required — it is called when the node is removed, and
anything it does not release (subscriptions, timers, workers) outlives the node.

For genuinely expensive work, use a real module worker rather than building one
from a stringified function:

```ts
new Worker(new URL('./my.worker', import.meta.url), { type: 'module' });
```

`src/app/workers/fractals/fractal.worker.ts` is a working example. The
stringify-a-class approach that preceded it depended on the bundler's exact
output and broke on a target change, silently.

---

## Two representations

The editor is one view of the flow; `<fb-flow-document>` is another, rendering
the same JSON as a document with the nodes as figures. Your node is mounted
through the same contract in both — so it keeps computing on the page — but the
document's `FbNodeApi` is inert: everything that would mutate the flow does
nothing. Draw accordingly, and do not assume `setMaxSize` will have an effect.

### Prose, formatting and formulas

Block text supports a small Markdown subset plus TeX spans:

```
**bold**   *italic*   `code`   [text](https://example.com)   $x^2$   $$\sum_i x_i$$
```

It is parsed into tokens, never into an HTML string, and the renderer sets
`textContent` — so document text cannot become markup no matter what a loaded
file contains. `javascript:` and `data:` links are rendered as plain text rather
than followed.

Formulas need a typesetter, and the library does not choose one for you — that
would put a large dependency on every consumer, including those with no
formulas. Supply one instead:

```ts
import katex from 'katex';
import katexCss from 'katex/dist/katex.min.css';   // as text; see below

const doc = document.querySelector('fb-flow-document');

doc.mathRenderer = (tex, display) =>
  katex.renderToString(tex, { displayMode: display, throwOnError: false });

// The typesetter's CSS has to be adopted, not linked: a <link> in the page head
// cannot reach into this element's shadow root.
const sheet = new CSSStyleSheet();

sheet.replaceSync(katexCss);
doc.extraStyles = [sheet];
```

Two practical notes. Import the stylesheet as a **string** — with esbuild that is
`loader: { '.css': 'text' }`. And KaTeX's CSS references its font files
relatively; because the stylesheet is adopted, those URLs resolve against the
**document**, so the fonts belong beside `index.html` rather than beside the CSS.
`scripts/build-lit-demo.mjs` copies them.

With no renderer set, formulas display their TeX source: readable, and obviously
a formula, rather than blank.

This hook is the one place document content becomes trusted markup, and it comes
from your app rather than from the JSON.

Give a node prose and it will read as a section rather than a box:

```json
{
  "id": 30, "type": "meter",
  "doc": {
    "body": "Text that flows around the figure.",
    "figure": { "width": "260px", "caption": "Live reading" }
  }
}
```
