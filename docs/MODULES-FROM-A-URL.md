# Loading a module from a URL

**Status: not built.** This is the design note for it, written now so that what
gets built next does not quietly make it impossible.

The goal: a reader pastes a URL into the app, the module loads, and its node
types appear in the palette. Later, a community server hosts those URLs and lets
people upload and manage their own modules.

---

## What already points this way

The pieces that would be hardest to add later are already true:

- **A module is one object.** `FbModule` has four fields. Nothing in it refers to
  the app, the bundler, or the workspace it was built in.
- **`prepareModule(module, registry)`** already takes a module object from
  anywhere and settles its formats against everything already loaded, renaming
  on a real collision and rewriting the sockets to match. A stranger's module
  cannot break a loaded one by naming a type badly.
- **`patchEditors`** already injects types into *running* editors and reloads
  only the documents that contain them. Nothing assumes modules arrive at
  startup.
- **A node type needs no framework.** `FbNodeMount` is a function that fills a
  host element. A module written against it depends on
  `@scaljeri/flow-based-core` and rxjs, and nothing else.

So the loading path is roughly:

```ts
const module = await import(/* @vite-ignore */ url).then(m => m.default);
const prepared = prepareModule(module, this.formats);

Object.assign(this.types, prepared.types);
this.patchEditors(prepared.types);
```

Four lines. The work is not in the loading — it is in everything around it.

---

## What stands in the way

### 1. The three build-time lists

`modules.service.ts` holds `PREFIXES`, `LOADERS` and a `modules` array, all
written by hand at build time. A URL-loaded module is in none of them.

`LOADERS` is easy: a URL *is* the loader. `PREFIXES` is the interesting one — it
exists because a saved flow names its node types (`weather-forecast`) and the app
must decide whether to fetch a module **before** it has the module to ask. For a
URL module the answer is to save the URL *with the flow*:

```jsonc
{ "modules": [{ "url": "https://…/weather.js", "prefix": "weather" }], "children": [ … ] }
```

A document then carries what it needs to be opened, which is what makes a shared
flow work on somebody else's machine at all. This is worth doing **before** the
community server, not after — every flow saved without it is a flow that cannot
be reopened.

### 2. Angular components cannot travel this way; mount functions can

A module whose drawings are Angular components carries compiled component
definitions. Loading one from a URL means the remote bundle and the host app must
share **one** Angular runtime — the same version, the same instance. Two copies
of Angular in one page do not co-operate.

That is solvable (import maps, module federation) and it is a large amount of
machinery for a community feature.

The framework-free path has none of that problem: `FbNodeMount` is a function,
rxjs is the only shared runtime, and rxjs tolerates two copies far better than
Angular does. **So community modules should be framework-free, and the docs
should say so plainly rather than letting people discover it after writing one.**
`src/app/nodes/meter/meter.node.ts` is the worked example.

If that is the intended path, the honest next step is to make it *nicer* rather
than merely possible: today an author writing plain DOM gets no help with
layout, controls, or the styling every other node has. A small
`@scaljeri/flow-based-kit` of framework-free building blocks — a labelled value,
a slider that already carries `FB_DRAG_IGNORE`, a chart box — would make the
simple path the pleasant one too.

### 3. Running a stranger's code

This is the part with no clever answer.

A module is JavaScript, loaded into the same page as the editor, with the same
access to the DOM, `fetch`, and `localStorage` — which is where flows are saved.
A malicious module can read every flow the reader has, silently, and post them
anywhere. Nothing about `FbModule` limits that, and no amount of reviewing the
`types` object would, because the harm happens at import time.

Real options, in increasing order of cost:

| Approach | Buys | Costs |
| --- | --- | --- |
| Curation only — the server publishes what its owner reviewed | Trust in a person, which is a real thing | Does not scale, and reviewing minified code is not review |
| Worker isolation — the module's *workers* run in a Web Worker | Data cannot reach the DOM or storage directly | Every worker becomes async; drawings still run in the page |
| `<iframe sandbox>` per module, postMessage protocol | A real boundary | A large rewrite of the mount contract; drawings become remote |
| Signing + a per-module permission prompt | Informed consent | Prompts are clicked through; signing proves origin, not intent |

The one that matters for a community server is probably a **combination**:
curation for a "verified" shelf, and an explicit "this module runs with the same
access as the editor itself" warning for everything else. What should *not*
happen is a URL field that loads anything with no statement of what that means.

Worth noting: the Network module already refuses to hold credentials, for
exactly this family of reasons — a node's config travels with the flow, so a
secret in one leaks three ways. A module system that runs arbitrary code has the
same shape of problem, one level up.

### 4. Versions and identity

Two readers open the same flow with `weather.js` at two different revisions, and
the flow means two different things. A community server needs immutable,
versioned URLs (`…/weather/1.4.2/module.js`) with the version saved in the flow,
and a "latest" pointer used only when *adding* a module, never when opening a
document.

### 5. CORS, and the rest of the plumbing

`import(url)` from another origin needs the far end to allow it. A community
server serving its own modules is the easy case. Anything else — a raw GitHub
URL, somebody's blog — needs a proxy, and a proxy that fetches arbitrary URLs is
its own security question.

---

## What to do first, in order

1. **Save the modules a flow needs, in the flow.** Cheap, and every day it is not
   done produces flows that cannot be reopened elsewhere.
2. **Make a framework-free module genuinely pleasant to write** — the kit above,
   and a template repository. If community modules must be framework-free, that
   path has to be the good one, not the fallback.
3. **Then** the URL loader, with the trust statement written before the input
   field exists.
4. **Then** the server: upload, versioning, a verified shelf, and a page per
   module generated from the same `name` / `description` fields the palette
   already reads.

Steps 1 and 2 are useful on their own even if the server never happens. That is
the test of whether they are the right first steps.
