# @scaljeri/flow-based-node-utils

Everything you need to write a **node library** for
[flow-based](https://github.com/scaljeri/flow-based) — the authoring contract and
a handful of small runtime helpers, in one **framework-free** package. No Angular,
no editor: a lib built against this can be bundled into a single file and loaded
into the editor from a URL, exactly like the in-repo `crypto` demo lib.

A node library is a bundle of node **types**. Each type is three things: a
**worker** (what it computes), a **view** (what it draws), and its **settings**
(its title, sockets and help). You export them as an `FbModule`.

## Install

```sh
npm i -D @scaljeri/flow-based-node-utils
# rxjs is a peer of the workers you'll write; add it if you use Observables:
npm i rxjs
```

> **Not on npm yet.** Until it is published, build it from this repository
> (`npm run build:lib`) and point your bundler at
> `dist/flow-based-node-utils` — the in-repo libs alias it exactly that way
> (see `scripts/build-libs.mjs`).

> Types come from here; so does `@scaljeri/flow-based-core`, which this package
> re-exports the authoring half of. Type against **this** package — never the
> Angular one (`@scaljeri/flow-based`), which would drag `@angular/core` into your
> type graph for types that touch nothing Angular.

## A minimal module

```ts
import type { FbMountModule, FbNodeWorker, FbNodeMount } from '@scaljeri/flow-based-node-utils';
import { lastValue } from '@scaljeri/flow-based-node-utils';
import { Observable, ReplaySubject } from 'rxjs';

/** The worker: one input, one output — it doubles the latest number it is given. */
class DoubleWorker implements FbNodeWorker {
  private readonly out = new ReplaySubject<number>(1);
  private sub?: { unsubscribe(): void };

  getStream(): Observable<number> { return this.out.asObservable(); }

  setStream(stream: Observable<unknown>): void {
    this.sub = stream.subscribe(value => {
      const n = lastValue(value);            // a helper: latest y of a series/point/number
      if (n !== undefined) this.out.next(n * 2);
    });
  }

  removeStream(): void { this.sub?.unsubscribe(); }
  destroy(): void { this.sub?.unsubscribe(); this.out.complete(); }
}

/** The view: a plain DOM mount — no framework. Return a teardown. */
const doubleNode: FbNodeMount = (host) => {
  host.textContent = '×2';
  return { destroy: () => { host.textContent = ''; } };
};

export default {
  name: 'Doubler',
  prefix: 'demo',                            // namespaces this module's type/format names
  description: 'Doubles a number.',
  types: {
    'demo-double': {
      component: { small: { mount: doubleNode } },
      settings: {
        title: 'Double',
        addableSockets: 'none',              // a typed union — fixed 1-in/1-out contract
        sockets: [
          { type: 'in', aux: 'x', formats: ['number'] },
          { type: 'out', format: 'number' },
        ],
        help: 'Emits twice the latest number on its input.',
      },
      worker: DoubleWorker,
    },
  },
} satisfies FbMountModule;
```

`FbMountModule`, not a plain `FbModule` annotation: `FbModule` is generic in
the component type and defaults to `unknown`, which absorbs the whole
`component` union — a typo'd `{ small: { mont: ... } }` compiled clean and
mounted as a blank box. The alias is the same module with its views checked.

Bundle it to one self-contained ES module and serve it anywhere with a JS
content-type and CORS open to the editor's origin:

```sh
esbuild my-module.ts --bundle --format=esm --target=es2022 --minify --outfile=my-module.js
```

Then load it: paste the URL in the editor's **Modules** dialog, or let a flow
carry it in `config.modules` — where the editor leaves a stranger's URL listed
but **off** until a reader consents, so opening a flow never runs unseen code.

## What's in the box

**The contract (types — erased at build):**
`FbMountModule` (author against this one), `FbModule`, `FbFormatDef`, `FbNodeWorker`, `FbNodeWorkerCtor`, `FbNodeMount`,
`FbNodeContext`, `FbNodeApi`, `FbNodeHandle`, `FbNodeSettings`, `FbNodeType`,
`FbNodeTypes`, `FbViewComponents`, `FbSocket`, `FbSocketType`, `FbSocketSide`,
`FbAddableSockets`.

**Contract runtime (values, re-exported from core):**
- `FB_DRAG_IGNORE` — put this class on a control in your view so the editor leaves
  it alone instead of treating a press as a node drag. Import it; a re-typed
  string fails silently on a typo.
- `readConfigValue(obj, path)` / `writeConfigValue(obj, path, value)` — walk a
  dotted path in a node's config.

**Helpers (framework-free):**
- `lastValue(v)` — the latest `y` of an `[x,y]` series, a single point, or a bare
  number; `undefined` until something numeric arrives (which you read as "not
  yet", not zero).
- `toNumber(v)` — coerce to a finite number or `undefined`. A **blank** string is
  `undefined`, not zero.
- `FbEnvelope` + `isEnvelope(v)` / `unwrap(v)` — the shared wire format for a value
  that travels with a name (`{ meta: { title }, value }`); `unwrap` returns the
  value whether or not it was wrapped.
- `injectStyleOnce(id, css)` — add a `<style>` to the page once per id, for a view
  that ships its own CSS and mounts many instances.
- `FbSeries` — `number[][]`, the `[x,y]` shape a plot draws as one layer.

## Declaring the contract version

A module may stamp the contract it was built against:

```ts
import { FB_MODULE_CONTRACT_VERSION } from '@scaljeri/flow-based-node-utils';

export default {
  name: 'Doubler',
  prefix: 'demo',
  contract: FB_MODULE_CONTRACT_VERSION,
  // ...
} satisfies FbMountModule;
```

Optional — an unstamped module reads as version 1 and always loads. A host that
speaks an OLDER contract than the module declares warns (it never blocks), so
your module degrades visibly instead of mysteriously.

## Two rules that make a URL lib safe

- **Nothing of the editor at runtime.** Import *types* from here freely (they
  vanish at build); import only the small *helpers* above as runtime code, which
  get bundled into your file. Never runtime-import the engine — your module shares
  nothing with the host, by design, which is what lets it be a single file.
- **Streams cross the boundary duck-typed.** The editor never does `instanceof`
  on an `Observable`, so your bundled rxjs and the host's coexist. Return plain
  objects and classes whose methods the host calls; don't rely on the host sharing
  a runtime instance with you.

## Identifying sockets

A socket has two names: **`aux`** is its stable machine identity (your worker keys
on it), **`name`** is a display label a flow may change. Key your worker on `aux`,
never on `name` — so a rename can't silently swap two inputs. A flow gives each
socket the `name` a reader recognises ("price", "lower band"); your view can read
those names off the sockets to describe itself.
