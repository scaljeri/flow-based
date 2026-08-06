# Writing a module

A **module** is a bundle of node types that joins a running editor. Mathematics,
Graphs, Network, Data are modules; so is whatever you write next.

You export **one thing**:

```ts
export const MY_MODULE: FbModule = {
  name: 'Weather',        // how it introduces itself to a human
  prefix: 'weather',      // disambiguates its data types on a collision
  formats: [ ... ],       // optional: the data types it defines
  types: { ... },         // the node types themselves
};
```

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
import { FbModule, FbNodeMount, FbNodeWorker, nodeMount } from '@scaljeri/flow-based';
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

export const CLOCK_MODULE: FbModule = {
  name: 'Clock',
  prefix: 'clock',
  types: {
    'clock-now': {
      component: { small: nodeMount(clockView) },
      settings: {
        title: 'Now',
        group: 'Clock',
        sockets: [{ type: 'out', format: 'number' }],
      },
      worker: ClockWorker,
    },
  },
};
```

No Angular API appears in that file: the drawing is plain DOM and the worker is
plain rxjs. It imports from `@scaljeri/flow-based` because that is where
`FbModule` lives, and that package re-exports all of `@scaljeri/flow-based-core`
— a module that draws with Angular components imports from exactly the same
place.

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
| `settings.sockets` | The inputs and outputs, in drawing order. |
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
  from the document view.

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

`src/app/modules.service.ts` holds three lists that must agree:

```ts
const PREFIXES = { ..., weather: 'weather' };            // type-name prefix → module id
const LOADERS  = { ..., weather: () => import('@scaljeri/flow-based-weather').then(m => m.WEATHER_MODULE) };
readonly modules = [ ..., { id: 'weather', title: 'Weather', description: '...' } ];
```

`PREFIXES` exists because a saved flow names its node types (`weather-forecast`)
and the app must decide whether to download a module **before** it has the module
to ask. Get this wrong and a flow using your types opens as empty boxes with no
workers behind them — which looks like a broken document rather than a missing
download.

---

## What this costs today, honestly

Adding a module is one file of real content and **six registrations around it**.
Three of those (`angular.json`, `tsconfig.json`, `build:lib`) exist only because
modules are workspace packages built by ng-packagr, and three
(`PREFIXES`, `LOADERS`, `modules`) exist only because the app decides at build
time which modules can exist at all.

None of that is a property of the module contract. `FbModule` is one object; a
module loaded from a URL would need none of the six. That is the subject of
[MODULES-FROM-A-URL.md](MODULES-FROM-A-URL.md).

---

## Checklist

- [ ] `index.ts` exports one `FbModule` with `name`, `prefix`, `types`
- [ ] every type has `settings.title`, `settings.sockets`, and a `group`
- [ ] every worker implements `destroy()` and actually releases everything
- [ ] `setConfigValue` implemented if the values are worth tuning from a document
- [ ] new formats carry a `description` — it is their identity
- [ ] controls inside a node carry `FB_DRAG_IGNORE`, or handle drag-versus-tap
      themselves (see [NODE-AUTHORING.md](NODE-AUTHORING.md))
- [ ] package files copied, three workspace registrations done
- [ ] `PREFIXES`, `LOADERS` and `modules` all mention the new id
- [ ] `npm run build:lib && npx playwright test smoke.spec.ts` passes
