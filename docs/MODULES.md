# Writing a module

A **module** is a bundle of node types that joins a running editor. Mathematics,
Graphs, Network, Data are modules; so is whatever you write next.

You export **one thing**:

```ts
export const MY_MODULE = {
  name: 'Weather',        // how it introduces itself to a human
  prefix: 'weather',      // disambiguates its data types on a collision
  contract: FB_MODULE_CONTRACT_VERSION,  // optional: what it was built against
  formats: [ ... ],       // optional: the data types it defines
  types: { ... },         // the node types themselves
} satisfies FbMountModule;
```

`satisfies FbMountModule` rather than a plain `FbModule` annotation: `FbModule`
is generic in the component type and defaults to `unknown`, which absorbs the
whole `component` union — a typo'd `{ small: { mont: ... } }` compiled clean
and mounted as a blank box. The alias is the same module with its views
actually checked. `contract` is optional (absent reads as pre-versioning); a
host that speaks an older contract warns but still loads, so the module
degrades visibly instead of mysteriously.

That is the entire contract. Everything else on this page is either what goes
*inside* `types`, or how the module gets built and reaches the app.

If you are writing a single node type rather than a bundle, read
[NODE-AUTHORING.md](NODE-AUTHORING.md) first — this page assumes you know what a
node type is.

---

## The smallest module that works

One node type, no formats, no settings panel, no framework. This block is
compiled by `npm run check:docs`, so it is known to be true:

```ts check
import type { FbMountModule, FbNodeMount, FbNodeWorker } from '@scaljeri/flow-based-node-utils';
import { Observable, ReplaySubject } from 'rxjs';

class ClockWorker implements FbNodeWorker {
  private readonly subject = new ReplaySubject<number>(1);
  private readonly timer = setInterval(() => this.subject.next(Date.now()), 1000);

  getStream(): Observable<number> { return this.subject.asObservable(); }
  setStream(): void { /* a producer has no inputs */ }
  removeStream(): void { /* a producer has no inputs */ }
  destroy(): void { clearInterval(this.timer); this.subject.complete(); }
}

const clockView: FbNodeMount = (host, { api }) => {
  const el = document.createElement('span');

  host.appendChild(el);

  const worker = api.worker as ClockWorker;
  const subscription = worker.getStream().subscribe(value => {
    el.textContent = new Date(value).toLocaleTimeString();
  });

  return { destroy: () => subscription.unsubscribe() };
};

export const CLOCK_MODULE = {
  name: 'Clock',
  prefix: 'clock',
  types: {
    'clock-now': {
      component: { small: { mount: clockView } },
      settings: {
        title: 'Now',
        group: 'Clock',
        sockets: [{ type: 'out', format: 'number' }],
      },
      worker: ClockWorker,
    },
  },
} satisfies FbMountModule;
```

No Angular API appears in that file: the drawing is plain DOM and the worker is
plain rxjs. It types against `@scaljeri/flow-based-node-utils`, the authoring
package — the whole contract plus a handful of framework-free helpers
(`lastValue`, `toNumber`, `injectStyleOnce`, the envelope), and nothing that
would drag `@angular/core` into the type graph. A module that draws with
Angular components — one added to THIS build — imports from
`@scaljeri/flow-based` instead, where `nodeMount` and the Angular mounting
live; that package re-exports the same contract.

---

## What a node type declares

```ts
{
  component: <one drawing, or one per view>,
  settingsComponent: <optional: this type's own settings panel>,
  settings: { title, group, config, sockets, ... },
  worker: <optional: the class that computes>,
}
```

| Field | Meaning |
| --- | --- |
| `component` | A single drawing, or `{ small, normal, full }`. **A missing view is a view the node does not have** — the shell offers no button to it. |
| `settingsComponent` | What draws this type's own configuration inside the shell's settings panel. Framework-free types return `mountSettings` on their handle instead. |
| `settings.title` | The name in the palette and on the node. |
| `settings.group` | Which palette group it is listed under. Presentation only — the engine never reads it. |
| `settings.config` | The default configuration object. The worker is handed **this very object**, so writing into it is what persists. |
| `settings.sockets` | The inputs and outputs, in drawing order. A socket has two names: `aux` is its stable machine identity, `name` a display label a flow may edit. **Route on `aux`, never on `name`** — a worker keyed on the label misroutes the moment a reader renames it. |
| `settings.resizable` | Opt in for a hand-resizable `normal` view. Your component must be written to fill the size it is given. |
| `settings.addableSockets` | `'in' \| 'out' \| 'both' \| 'none'`. A plot whose every input is a layer takes as many as you like; a derivative has exactly one function to differentiate. |
| `settings.views` / `defaultView` | Which sizes are offered, and which one it opens at. |
| `worker` | Constructed as `new worker(state.config, state.sockets)`. Omit it for a node that only draws. |

### The worker

```ts
interface FbNodeWorker {
  getStream(socket?: FbSocket): Observable<any>;
  setStream(stream: Observable<any>, socket: FbSocket, connection?: FbConnection): void;
  removeStream(connection?: FbConnection): void;
  destroy(): void;
  setConfigValue?(path: string, value: unknown): void;   // optional
}
```

Four methods, one optional. Two things are easy to get wrong:

- **`getStream(socket)` is asked per socket.** A node with two different outputs
  answers differently depending on which one is asked; a node with one output
  can ignore the argument entirely.
- **`setConfigValue` is what makes a node tunable from a document.** Writing into
  `state.config` from outside persists — the worker holds that same object — but
  tells the running worker nothing. Only the worker knows whether a changed value
  means recompute, re-emit, or restart. A type without it is simply not tunable
  from the document view. It is also the announce channel: the engine wraps it,
  so a worker's OWN mutators (a `set()`, a `write()`) should route through it —
  a direct config write is invisible to the host and never marks the flow dirty.
- **`setStream(stream, socket)` decides by `socket.aux ?? socket.name`.** The
  `aux` is yours and stable; the `name` belongs to the flow and its reader.

`destroy()` must undo everything: timers, subscriptions, listeners.

---

## Formats: the data types a module brings

A socket's `format` says what travels through it. Modules may define their own:

```ts
formats: [
  { name: 'geo', description: 'Places on the earth: lat, lon, and a name', color: '#4bb3fd' },
  { name: 'temperature', description: 'Degrees Celsius', refines: 'number' },
],
```

| Field | Meaning |
| --- | --- |
| `name` | What sockets write. |
| `description` | **What the type IS. This is its identity across modules** — see collisions below. |
| `refines` | The base it refines. A refinement satisfies every demand for its base; the base never satisfies a demand for the refinement. |
| `color` | A default line colour. Presentation, so never part of identity. |

Four base formats exist before any module loads: `number`, `boolean`, `string`,
`object`. Every refinement chain ends on one of them. `array` is deliberately
**not** one: an array is an array *of* something, so declare `point`, not
`array`.

### Collisions are handled, not forbidden

Two modules may both define `score`. When they mean the same thing — same
description — they share the name. When they do not, the second one's type is
renamed to `<prefix>:score`, and **its sockets are rewritten for it
automatically**. This is why `prefix` is required and why the description is
worth writing carefully: it is the identity, not the name.

You never have to check whether a name is taken.

---

## Building it as a package

In this workspace a module is its own package, so enabling one genuinely
downloads it — the editor does not carry a megabyte of algebra for readers who
never open the Math group.

Copy `projects/flow-based-network` and change the names. It needs:

| File | What is in it |
| --- | --- |
| `projects/flow-based-<name>/package.json` | `@scaljeri/flow-based-<name>`, with `@scaljeri/flow-based` and `rxjs` as peer dependencies |
| `.../ng-package.json` | `dest: ../../dist/flow-based-<name>`, entry `src/public_api.ts` |
| `.../tsconfig.lib.json` and `tsconfig.lib.prod.json` | copies of the neighbours' |
| `.../src/public_api.ts` | `export * from './lib/index';` |
| `.../src/lib/index.ts` | the `FbModule` const — **this is the only export that matters** |

Then three registrations outside the package:

1. `angular.json` — a project entry (copy the `@scaljeri/flow-based-network` one).
2. `tsconfig.json` — a path mapping to `./dist/flow-based-<name>`.
3. `package.json` — add `ng build @scaljeri/flow-based-<name>` to `build:lib`.

### And how the app finds it

`src/app/modules.service.ts` holds two lists that must agree:

```ts
const LOADERS = { ..., weather: () => import('@scaljeri/flow-based-weather').then(m => m.WEATHER_MODULE) };

readonly modules = [
  ...,
  { id: 'weather', prefix: 'weather', title: 'Weather', description: '…' },
];
```

The `prefix` on that entry is not decoration. A saved flow names its node types
(`weather-forecast`) and the app must decide whether to download a module
**before** it has the module to ask what its prefix is. Get it wrong and a flow
using your types opens as empty boxes with no workers behind them — which looks
like a broken document rather than a missing download.

---

## The other way: a module from a URL

Everything above is what it takes to add a module **to this build**. A module
that lives on the internet needs none of it: no package, no `angular.json`, no
entry in any list. Paste the URL into the Modules dialog and it loads.

The catch is what such a module may depend on at runtime, and the answer is
pleasant: **almost nothing**. `FbMountModule`, `FbNodeMount` and `FbNodeWorker`
are types, so they compile away. The few runtime values worth having —
`FB_DRAG_IGNORE`, `FB_MODULE_CONTRACT_VERSION`, the value helpers — come from
`@scaljeri/flow-based-node-utils` and are BUNDLED into your file, the way rxjs
is; import them rather than re-typing them, which fails silently on a typo.
So a whole module can be one self-contained file:

```ts check
import type { FbMountModule } from '@scaljeri/flow-based-node-utils';

// A type-only import: erased at compile time, so the built file imports nothing
// and the browser needs no import map to load it.
export default {
  name: 'Greeting',
  prefix: 'greet',
  description: 'One node, fetched from a URL',
  types: {
    'greet-hello': {
      component: {
        small: {
          mount: (host: HTMLElement) => {
            const el = document.createElement('span');

            el.textContent = 'hello';
            host.appendChild(el);

            return { destroy: () => el.remove() };
          },
        },
      },
      settings: {
        title: 'Hello',
        group: 'Greeting',
        sockets: [{ type: 'out', format: 'string' }],
      },
    },
  },
} satisfies FbMountModule;
```

Rules for a module served over the web:

- **An ES module**, served with a JavaScript content type. The default export is
  taken first; failing that, the first export that looks like a module, so
  `export const WEATHER_MODULE = …` works too.
- **CORS** must allow this app's origin, exactly as for any other fetch. A
  browser will not import from an origin that has not said yes.
- **No Angular components.** Two Angular runtimes in one page do not
  co-operate. Draw with `FbNodeMount`, as above.
- **rxjs**, if a worker needs it, must be bundled in. Two copies are heavier but
  they do work: nothing in the editor tests an Observable with `instanceof`.

### Published beside the app

There is no community server yet, so this deployment is the server. Anything in
`playground/modules/*.ts` is bundled to one self-contained ES module next to the
built app and listed in `modules/index.json`; the Modules dialog reads that list
and offers each entry with an Add button, so no address has to be typed.

```
npm run build:playground        # into dist/demo/browser/modules
```

It runs as part of `build:demo` and `deploy`. The catalogue is generated by
importing each built file and asking it what it is — a list written by hand
beside the modules is a list that disagrees with them by next month.

`playground/modules/triggers.ts` is the worked example, and deliberately uses
the whole contract rather than the easiest corner of it: two node types, a
worker each, a settings panel contributed through `mountSettings`, and a button
that must not drag the node it sits on. It exists because the Network module's
Request node has a trigger input that nothing in the build could reach.

Note what it imports: types (erased) and rxjs (bundled in, ~15 kB for the whole
module). Nothing of the editor survives to runtime.

A flow that uses such a module **records its URL** — `config.modules` on the
root — so opening that flow anywhere fetches what it needs first. Nothing about
`greet-hello` says where on the internet to find it; the type name only names a
module for the ones shipped in the build.

And the part with no clever answer: a fetched module is code running in this
page, with the flows in this browser's storage within reach. The dialog says so
next to the field. See [MODULES-FROM-A-URL.md](MODULES-FROM-A-URL.md) for what a
community server would have to do about that.

---

## What this costs today, honestly

Adding a module **to this build** is one file of real content and **five
registrations around it**. Three of those (`angular.json`, `tsconfig.json`,
`build:lib`) exist only because modules are workspace packages built by
ng-packagr, and two (`LOADERS`, `modules`) exist only because the app decides at
build time which shipped modules can exist at all.

None of that is a property of the module contract, which is why the URL path
needs none of it.

---

## Checklist

- [ ] `index.ts` exports one module with `name`, `prefix`, `types` —
      `satisfies FbMountModule` for a framework-free lib, so the views are checked
- [ ] `contract: FB_MODULE_CONTRACT_VERSION` stamped, so a future host can warn
- [ ] every type has `settings.title`, `settings.sockets`, and a `group`
- [ ] every worker implements `destroy()` and actually releases everything
- [ ] `setConfigValue` implemented if the values are worth tuning from a
      document, and the worker's own mutators route through it
- [ ] workers route inputs on `aux`, never on the editable `name`
- [ ] new formats carry a `description` — it is their identity
- [ ] controls inside a node carry `FB_DRAG_IGNORE`, or handle drag-versus-tap
      themselves (see [NODE-AUTHORING.md](NODE-AUTHORING.md))
- [ ] package files copied, three workspace registrations done
- [ ] `LOADERS` and `modules` both mention the new id, and the `modules` entry
      carries the type-name `prefix`
- [ ] `npm run build:lib && npx playwright test smoke.spec.ts` passes
