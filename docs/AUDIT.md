# flow-based — audit & modernisation roadmap

Audit date: 2026-07-30. Commit `0eb283c`, branch `modernize`.
Scope read: all of `projects/flow-based/src` (the library, ~2.8k lines) plus the
demo's extension surface (`src/app/fb-settings.ts`, `node-helpers.ts`,
`app.module.ts`, workers).

---

## 1. Verdict

The **idea and the core design are good** — better than most node-editor
projects. What's holding it back is not the concept, it's three things:

1. the toolchain is 8 years stale and the project **cannot build at all** today;
2. the graph engine is sound but **untested and untyped at its edges**, so
   correctness bugs hide in `!` assertions;
3. rendering correctness is maintained by **hand-driven change detection and
   `setTimeout`**, which is the direct cause of the README's "very buggy".

None of these are rewrites. The library is small. All three are fixable in
sequence, and the order matters — see §5.

### What's genuinely worth keeping

- **State is plain serializable JSON.** `FbNodeState` is a recursive
  `{type, id, config, sockets, connections, children}`. Export/import is free,
  and this is what makes the whole thing documentable-as-a-diagram. Don't lose
  this property.
- **View and computation are separated.** A node type is
  `{component, settings, worker}` — the Angular component draws it, the
  `FbNodeWorker` computes it. This is the right split, and it's precisely why a
  framework-agnostic rewrite is feasible at all: the workers have zero Angular
  in them.
- **Dataflow is RxJS end to end.** `getStream`/`setStream`/`removeStream` per
  socket. Clean contract, only 4 methods.
- **Hierarchical flows actually work.** `FlowWorker` bridges `Subject`s across
  nesting levels so a composite node is indistinguishable from a leaf node to
  its neighbours. This is the "leveling" from the README and it's the feature
  that differentiates the project. Most editors (Node-RED, Rete, Litegraph) do
  not do this properly.
- **Sockets have a type system.** `socket.format` + `SocketComponent.isAccepting`
  gives live compatibility highlighting while dragging a connection. Good idea,
  under-exploited.

---

## 2. Blocking: it does not build

| Problem | Detail |
|---|---|
| Angular **7.0** (Oct 2018) | Needs Node 8–10. Installed Node is **v26**. |
| `@angular/http` | **Removed in Angular 8.** Dependency no longer exists. |
| `@angular/material` barrel | `import {...} from '@angular/material'` — removed in v9. `app.module.ts:14-18`. |
| TSLint 5 | Deprecated 2019, dead. Both `tslint.json`s and 3 `architect.lint` targets. |
| Protractor | Discontinued 2023. Whole `e2e/` project. |
| `ng-packagr` 4 / `build-ng-packagr` | Replaced by `ng-packagr` + `@angular-devkit/build-angular:ng-packagr`. |
| `core-js@2`, `target: es5`, `zone.js@0.8` | All obsolete; zone.js optional now (zoneless). |
| No `node_modules`, no `yarn` binary | `yarn.lock` present but yarn isn't installed. |
| Library `peerDependencies: ^6.0.0` | Repo is on 7. Wrong either way. |

`tsconfig.json` sets `strictNullChecks` but **not** `strict`, so `noImplicitAny`
is off. That has a real consequence, not just a stylistic one — see §4.1.

---

## 3. Architecture findings

### 3.1 The published package is unusable — highest-impact finding

`public_api.ts` exports exactly three files:

```ts
export * from './lib/flow-based.component';
export * from './lib/flow-based.module';
export * from './lib/flow-based';
```

But the documented extension surface is **not** in there. `NodeService` — whose
own header comment reads *"Primary service for custom nodes to communicate with
the framework"* — is not exported. Neither is `FlowBasedService`,
`SocketComponent`, `SocketService`, `FB_NODE_HELPERS`, `FB_SOCKET_COLORS`,
`FbSocketColors`, or `MovableDirective`.

This is invisible from inside the repo because **the demo never consumes the
package**. Every demo import reaches into library source by relative path:

```ts
// src/app/app.module.ts:10
import { FB_NODE_HELPERS, ... } from '../../projects/flow-based/src/lib/flow-based';
// src/app/node-helpers.ts:1
import { FbNodeState, XxlSocket } from '../../projects/flow-based/src/lib/flow-based';
```

The `@scaljeri/flow-based` path mapping in `tsconfig.json` exists but is unused,
and it points at `projects/flow-based/` (the project root, not `dist/`), so it
wouldn't validate the built package anyway.

**Consequence:** `@scaljeri/flow-based@0.0.7` on npm cannot be used to build a
custom node. Nobody has noticed because the only consumer cheats.

**Fix:** point the demo at the path mapping, mapped to `dist/flow-based`, and
build the library before serving. The compile errors that appear are exactly the
list of things that must join the public API. This is a half-day change that
makes the package real, and it should happen *early* because it constrains every
later API decision.

### 3.2 Root-singleton state makes multiple/nested editors fragile

`FlowBasedService` is `providedIn: 'root'` and holds a single `flow: Flow` plus a
`flowStack: FlowBasedComponent[]` where `currentFlow` is `flowStack[0]`.
`SocketService` is likewise a root singleton with one global
`sockets: {[id]: SocketDetails}` map.

- Two independent `<xxl-flow-based>` roots on one page share one `Flow` and
  overwrite each other's state.
- Nested flows work only via `activateFlow`/`deactivateFlow` unshift/shift, so
  correctness depends on component construction/destruction *order*.
- `FlowBasedComponent.ngOnChanges` calls `flowService.initialize(this.state)` on
  **any** input change when `root` is true — including `active` or `type` — which
  rebuilds the entire `Flow` and silently discards the previous one's workers
  without calling `destroy()`.

**Fix:** make the graph instance component-scoped (provided on
`FlowBasedComponent`, not root), and gate `initialize` on
`changes.state?.firstChange || changes.state`.

### 3.3 Workers leak on node deletion

`Flow.removeNode()` deletes `this.nodes[id]` but **never** removes
`this.workers[id]` and **never** calls `worker.destroy()`. `destroy()` only runs
via `Flow.destroy()`, on every worker at once.

So deleting a `random-numbers` node leaves its interval running and its
`Observable` emitting forever. Same for `this.sockets[socketId]` entries — never
cleaned for a removed node.

Matching leak on the view side: `SocketService.addSocket()` has no counterpart.
`SocketComponent.ngOnDestroy` unsubscribes but does not deregister itself, so the
global `sockets` map accumulates `SocketDetails` pointing at detached DOM and
destroyed components — and `clearPosition()` then iterates all of them, calling
`resetPosition()` on dead objects, on every single node move.

### 3.4 Change detection is manual, and that's the "buggy" feeling

- 35 explicit `detectChanges()` calls.
- 15 `setTimeout`s used purely as a scheduler — including one commented
  `// TODO: Fix timeout-ception` (`flow-based.component.ts:170`) and
  `MovableDirective.update()`'s `// Weirdness going on here`.
- Repaints are triggered by identity-mutating arrays: `this.state.connections =
  [...this.state.connections!]`.

This is a hand-rolled reactivity system. Angular signals replace essentially all
of it: derive connection geometry from node positions as a `computed`, and the
`setTimeout`/`detectChanges` pairs disappear rather than get refactored.

### 3.5 Connection geometry is measured against a stale rect

`ConnectionLinesComponent` caches `this.rect =
element.getBoundingClientRect()` in `ngOnInit`. The re-measure lives in:

```ts
ngOnChanges(changes: SimpleChanges): void {
  if (changes.connection) {   // <-- no such input; the input is `connections`
```

`changes.connection` is **always undefined** — there is no `connection` input.
So the branch is dead, `this.rect` is measured once and never again, and
`controlPoints` is never reset. Any time the SVG's own offset changes without a
full re-init, every line renders offset from its sockets. This is a concrete,
one-line explanation for a whole class of visual bugs.

Related, in the same file:
- `d()` dereferences `getSocket(connection.out!).comp.position` with **no** guard,
  while the very next line guards the `in` socket with a `|| {comp:{position}}`
  fallback. An out-socket not yet registered throws during load.
- `stopColorStart()` uses `this.colors[...]` unguarded even though `colors` is
  `@Optional()`; `pointerColor()` guards it. Inconsistent — throws if
  `FB_SOCKET_COLORS` isn't provided.
- `arrow()` reads `this.controlPoints[id]`, which is populated **as a side effect**
  of `d()`. It works only because the template calls `d()` before `arrow()` in
  document order, on every change-detection cycle. Side-effecting template
  getters doing `getBoundingClientRect` math per CD pass is both a correctness
  and a performance problem.

### 3.6 Positions are percentages, which blocks zoom/pan

`MovableDirective` binds `style.top.%` / `style.left.%` and computes drag deltas
as `clientX / parentWidth * 100`. Node layout is therefore relative to container
size: resize the window and the graph distorts rather than translates — hence the
`@HostListener('window:resize') → repaint()` workaround.

This is also the single thing standing between the project and zoom/pan, which
is table stakes for a node editor. The standard model is absolute graph
coordinates plus one CSS transform on a viewport element. Switching to that fixes
resize distortion *and* unlocks zoom, pan, minimap, and fit-to-view together.

### 3.7 Format propagation is a fixpoint loop with a magic bound

```ts
let count = 0;
while (this.connectNodes() && ++count < 100) { }
if (count === 100) { console.warn('Connecting all nodes failed'); }
```

`connectNodes()` sweeps *every* connection and returns true if *any* socket
format changed, so the graph is re-swept until nothing changes — up to 100 times.
This appears twice (`initialize`, `rebuildNodeConnections`). It's an
O(connections × iterations) stand-in for type propagation, it can silently fail,
and `rebuildNodeConnections` runs on every single connect/disconnect/socket
removal.

The correct shape is a topological walk from typed sources, propagating along
edges once, with an explicit cycle report. On a small graph the current version
is fast enough — the problem is that "failed" is a `console.warn` and the user
sees a graph that is quietly, partially wrong.

### 3.8 IDs are timestamps

Two independent generators:

```ts
// flow.ts:239
get uniqueId(): number { return Date.now() + ++this.uniqueIdCount; }
// flow-based.service.ts:14
let uniqueId = Date.now();  // then ++uniqueId
```

`Date.now() + counter` collides trivially (`t=1000,c=2` == `t=1001,c=1`), the two
generators can collide with each other, and IDs differ every run — so no
deterministic fixtures and no reproducible tests. Use a monotonic counter per
`Flow`, or a `crypto.randomUUID()` string; either way, one source.

### 3.9 Type-level problems

- `XxlConnection.from/to: number | HTMLElement` unions a **domain node id** with a
  **DOM element**, forcing `typeof connection.from === 'object'` branching in the
  renderer (`connection-lines.component.ts:108`) and `as number` casts throughout
  `flow.ts`. Two unrelated concepts sharing a field. Split them.
- `XxlFlowUnitState` and `FbNodeState` are near-duplicates (the latter adds
  `connections`/`children`); `XxlFlow` is a third overlapping shape. The codebase
  is mid-migration from `Xxl*` to `Fb*` naming and both survive, including in the
  public API (`XXL_FLOW_TYPES` alongside `FB_NODE_HELPERS`).
- `FbNodeType.worker: FbNodeWorker` is typed as an **instance** but used as a
  **constructor**: `new worker(state.config, state.sockets)` (`flow.ts:248`).
  Should be `Type<FbNodeWorker>` with a declared constructor signature.
- Nearly every field is optional (`id?`, `sockets?`, `connections?`), which forces
  `!` non-null assertions everywhere — I count them throughout `flow.ts`. Those
  assertions are exactly where the runtime crashes hide: `getSocket()` does
  `this.getNode(this.sockets[id])!.state.sockets!` and throws a bare TypeError for
  any unregistered socket. Model "under construction" vs "valid" as distinct
  types instead.
- `noImplicitAny` off produces a live bug class:
  `register(id: number, callback: (any) => boolean | void, ...)` declares a
  parameter **named** `any` of implicit type `any` — not a callback taking `any`.
  Appears in `flow-based.service.ts:133` and `node-service.ts:29`.

### 3.10 Dead code

- `XxlDriver` (`flow-based.ts:120`) — every method empty. Unused.
- `FlowBasedServiceHelper` (`flow-based.ts:160`) — `private flowHandlers` never
  initialised, so `addFlowHandler` would throw on first call. Unused.
- `flow-based-manager.service.ts` — 8 lines, and registered **twice** in the same
  `providers` array (`flow-based.module.ts:37,42`).
- `bezier.ts` exists twice: `utils/bezier.ts` (152 lines) and
  `connection-lines/bezier.ts` (51). Only the latter is imported.
- `utils/socket.ts`, `utils/document.service.ts` (10 lines) — unused.
- `XXL_FLOW_UNIT_STATE` is injected into a child injector by
  `DynamicComponentDirective` but nothing reads it.
- 414 commented-out lines; 13 stray `console.log`s (including
  `node-service.ts:54`'s bare `'clicked'`).

### 3.11 No tests

All 9 spec files are the **untouched Angular CLI scaffold** — `should create`,
nothing else. Meanwhile the parts that most need tests are pure functions with no
DOM dependency at all:

- `utils/flow.ts` (264 lines) — the entire graph engine
- `connection-lines/bezier.ts` — pure math
- `node-helpers.ts` format propagation — pure

Zero coverage on the graph engine is the single biggest reason refactoring feels
dangerous. It's also the cheapest thing on this list to fix.

`ResizeObserver` is used via `declare global` + `window.ResizeObserver` with no
feature check (`node.component.ts:21-25,69`) — fine in 2026 browsers, but the
observer callback body is empty (`// TODO`), so the observer does nothing at all.

---

## 4. Roadmap

Ordered by dependency, not by appeal. Each stage leaves the repo working.

### Stage 0 — Make it build and run (prerequisite for everything)

Upgrade Angular 7 → 20 in one deliberate jump rather than eight `ng update`
hops; at 8.3k lines it's faster to fix forward than to walk the migration chain.

- Drop `@angular/http`, `core-js@2`; `target: es2022`; drop `zone.js` (zoneless).
- Fix `@angular/material` barrel imports to per-entry-point.
- TSLint → ESLint (`angular-eslint`). Protractor → Playwright. `build-ng-packagr`
  → `ng-packagr`.
- Fix library `peerDependencies` to the real Angular range.
- Regenerate the lockfile (pick npm or yarn deliberately; yarn isn't installed).
- Turn on `strict` — including `noImplicitAny`. Expect real findings, per §3.9.

**Exit:** `ng serve` renders the fractal demo; `ng build @scaljeri/flow-based`
produces a package.

### Stage 1 — Test the engine, then fix the leaks

Do this *before* any restructuring, so the restructuring is verifiable.

- Unit-test `Flow` directly: add/remove node, add/remove connection, remove
  socket, nested flows, format propagation, cycles. It's a plain class — no
  TestBed needed.
- Unit-test `bezier.ts` and the `NODE_HELPERS.connect` rules.
- Then fix, with tests proving each: worker leak on `removeNode` (§3.3), socket
  deregistration (§3.3), the `changes.connection` typo (§3.5), unguarded
  `getSocket` in `d()` (§3.5), ID generation (§3.8), `initialize` on every
  `ngOnChanges` (§3.2).

**Exit:** meaningful coverage on `utils/flow.ts`; the known-bug list is closed.

### Stage 2 — Make the package real

Per §3.1, and early, because it constrains all later API design.

- Point the demo at `@scaljeri/flow-based` → `dist/flow-based` via tsconfig
  paths; build library before serve.
- Export everything a custom node genuinely needs; document that surface.
- Settle `Xxl*` vs `Fb*` in one pass, with deprecated aliases if you care about
  0.0.7 consumers (you probably don't).
- Delete §3.10 wholesale.
- Split `XxlConnection`'s id/element union (§3.9).

**Exit:** a node can be built against the published package, in a scratch app,
with no deep imports.

### Stage 3 — Reactivity and the canvas

The stage that actually kills "very buggy".

- Node/connection state → signals; connection geometry → `computed`. Delete the
  `detectChanges`/`setTimeout` scaffolding (§3.4) rather than refactoring it.
- Absolute graph coordinates + a single viewport transform (§3.6). This is what
  buys zoom, pan, fit-to-view, and minimap — and it removes the resize
  distortion.
- Replace socket-position `getBoundingClientRect` caching with geometry derived
  from graph coordinates, so lines can't desynchronise from sockets by
  construction.
- Replace the 100-iteration fixpoint with a topological propagation pass that
  reports cycles explicitly (§3.7).

**Exit:** drag, zoom, resize are visually correct with no manual repaint calls
anywhere.

### Stage 4 — Framework-agnostic core (your README's own TODO)

Only sensible *after* Stage 3, because Stage 3 is where the Angular-specific
reactivity gets removed.

- Extract `Flow`, format propagation, bezier math, and the `FbNodeWorker`
  contract into a zero-dependency `@scaljeri/flow-based-core`. These are already
  Angular-free — this is genuinely mostly a move.
- Rebuild the shell (canvas, node chrome, sockets, connection SVG) as Lit web
  components consuming that core.
- Keep the Angular package as a thin wrapper over the web components, so the
  existing demo keeps working. React/Vue wrappers then become small.

### Stage 5 — The "next level" features

Now cheap, because the foundation supports them:

- **Undo/redo** — trivial once state is signal-based and JSON-serializable.
- **Save/load + versioned schema** — the JSON already exists; give it a version
  field and a migration path.
- **Node library / palette** with search, replacing the current overlay.
- **Real web-worker execution** — `src/app/workers/webworker.ts` builds a Worker
  from a blob but `app.component.ts:43-49` has it commented out. Fractals
  currently compute on the main thread.
- **External node packages** from npm (README TODO) — needs Stage 2's real public
  API first.
- **Connection routing** — orthogonal/stepped routing, overlap avoidance.
- **Multi-select, box-select, copy/paste, alignment.**
- **Validation surface** — show format mismatches and cycles in the UI instead of
  `console.warn`.

---

## 5. If you only do three things

1. **Stage 0.** Nothing else is possible; the project is currently unrunnable.
2. **Test `utils/flow.ts`.** 264 untested lines holding the entire engine. It's a
   plain class — this is hours, not days, and it makes everything after it safe.
3. **Make the demo consume the built package** (§3.1). One change that exposes a
   fundamental packaging defect nobody can currently see.

---

## 6. Progress log

The assessment above is preserved as written, on commit `0eb283c`. This section
records what has since changed.

### Stage 0 — toolchain (done)

Angular 7 → 22.1, TypeScript 6.0.3, ESLint, vitest, Playwright, `@angular/build`.
Library and demo both build; the demo now consumes the library through its package
entry point, so §3.1 is closed. Details in `docs/MIGRATION-CHECKLIST.md`.

Corrections to this document that the migration turned up:

- §2 claimed `indigo-pink.css` was gone. It still ships in Material 22.1 (all four
  M2 prebuilts do), though the theming guide says they will be removed.
- §2 said to drop zone.js. That was wrong to do in Stage 0: this code depends on
  `setTimeout` plus 35 manual `detectChanges()` calls, so zoneless has to wait for
  Stage 3 to remove that scaffolding. zone.js is opted back in explicitly.
- `ComponentFactoryResolver` (§3.9's neighbour) was removed in Angular **22.0**
  itself, so the dynamic-node fix was mandatory rather than advisable.

New defects found while migrating, invisible to the compiler:

- **`deepClone` crashed on any config containing an array.** It called
  `this.deepclone(item)` from inside a plain exported function — `this` undefined
  *and* the name misspelled — and also threw on `null`. Now `structuredClone`,
  with tests. Fixed.
- **`@Host()` no longer reaches the creating component's providers** for a
  dynamically created component, so every node type's `@Host() NodeService`
  failed with NG0201. Dropped from all ten. Fixed.
- **`XXL_FLOW_UNIT_STATE` was actively harmful, not merely dead** (§3.10 listed it
  as unused): providing it required a custom injector, which replaces the
  element-injector chain and broke the `@Host()` lookups above. Deprecated.
- **The fractal web worker was a syntax error.** It stringifies a class and
  re-evaluates it in a worker, relying on the old `es5` output where methods were
  separate *enumerable* prototype assignments and the function was named. A native
  ES2022 class keeps methods inline and non-enumerable, and the bundler drops the
  name, so the emitted text began `class {` — invalid as a statement. Fixed, but
  the approach is inherently fragile; see Stage 5.
- **Edited custom-code was never persisted.** `CustomCodeComponent` has a `func`
  setter that writes `state.config.func`, but nothing called it, so code typed
  into the editor never reached the exported JSON. Fixed via the CM6 update
  listener.

### Stage 1 — engine tests and bug fixes (done)

51 unit tests on the engine, up from zero real ones (§3.11). Every defect below
now has a regression test.

Fixed from this document:

- §3.3 worker leak — `removeNode` now destroys the worker and drops it from the
  registry, recursively for a composite node's children.
- §3.3 socket-index leak — removed nodes deregister their sockets; `SocketService`
  gained the `removeSocket` that `addSocket` never had, and `SocketComponent`
  calls it on destroy.
- §3.3 unguarded `removeStream` in `removeSocket` — guarded, like
  `removeConnection` already was.
- §3.5 the `changes.connection` typo — the input is `connections`, so that branch
  was dead and `rect` was measured once and never re-measured.
- §3.5 unguarded out-socket lookup in `d()` — the `in` socket had a fallback, the
  `out` socket did not.
- §3.2 `initialize()` on every `ngOnChanges` — now gated on `changes['state']`.
- §3.8 timestamp ids — one shared `IdGenerator`, seeded past everything in a
  loaded flow, replacing two colliding wall-clock generators. Ids are now
  deterministic, so fixtures are reproducible.
- §3.9 `getNode`/`getSocket` returning `| undefined` instead of lying about
  always-present and crashing through `!`.
- Composite nodes' own connection lists are cleaned on removal; they never were.

Also fixed, found by the strict-mode pass:

- `zoom-canvas`: `'Fractal: ' + this.label ? … : …` parses as
  `('Fractal: ' + label) ? … : …`, always truthy — the prefix and the `'none'`
  fallback never rendered.
- `random-numbers`: the worker read `config.integers` while the settings declare
  `integer`, so "Integers only" always started unchecked against its own default.
- `canvas`: `putImageData(input, 0, 0)` passed the whole instruction array instead
  of `item.data`.
- `custom-code`: a compile failure left `func` undefined, and the immediately
  following initial call threw a TypeError recorded as `runtimeError` — masking
  the real `compileError`.
- `fractal`: the dropdown offered "Koch Snowflake", which has no entry in
  `AVAILABLE_FRACTALS`, so selecting it threw. Removed until implemented.
- `default-front`: `@ViewChild('img')` was read in `ngOnInit` without
  `{static: true}`. ViewEngine resolved such queries before `ngOnInit`; Ivy does
  not, so this had been silently broken since Angular 8 and `calibrate()` never
  fired on image load.
- The node registry is now typed (`FB_CONFIG: FbNodeTypes`, each settings object
  `FbNodeSettings`). It was supplied via `useValue`, which Angular types as `any`,
  so nothing was checked. Typing it immediately caught two workers declaring
  `sockets` as a *required* constructor parameter while the engine passes the
  optional `state.sockets` — and neither used it.

### Stage 2 — public API and naming (done)

- **The `Xxl*` → `Fb*` rename is finished.** `FbPosition`, `FbSocket`,
  `FbSocketType`, `FbSocketEvent`, `FbSocketDetails`, `FbConnection`,
  `FbSocketBuilderService`, `FB_NODE_TYPES`. The old names remain as
  `@deprecated` type aliases so 0.0.x consumers still compile; `XXL_FLOW_TYPES`
  is an alias for the new token, so DI keeps working either way.
- Element selectors and directive attributes follow: `fb-flow-based`,
  `fb-socket`, `fb-connection-lines`, `fbMovable`, `fbMovableArea`,
  `fbDraggable`, `fbDynamicComponent`. SCSS identifiers too (`fb-size`,
  `$fb-gutter-size`). This *is* a breaking change for anyone with the old tags in
  a template — unavoidable, and the point of doing it before 1.0.
- **`XxlConnection`'s `number | HTMLElement` union is split** (§3.9). `FbConnection`
  is a graph edge with `from`/`to` as node ids; `FbElementConnection` is the
  element-to-element line a node draws internally, which never enters the graph.
  `FbAnyConnection` plus an `isElementConnection()` type guard replaces the
  `typeof x === 'object'` checks and `as HTMLElement` casts. `strictTemplates`
  immediately caught two templates reading `.in`/`.out` off the union.
- **`XxlFlow` and `XxlFlowUnitState` are gone** as distinct shapes — both were
  subsets of `FbNodeState`, which is now the single recursive node/flow type.
- `XxlDriver`, `FlowBasedServiceHelper`, `XxlWorkerService`, `ConnectionDetails`
  and `XXL_FLOW_UNIT_STATE` deleted — all unused, and the last one actively
  harmful (see Stage 0).
- `ContextMenuComponent` deleted: declared in the module, used in no template.
- **`getWorker()` and `getSocket()` now admit they can miss.** Typing them honestly
  surfaced three real crash sites in the demo that the `!` assertions had been
  hiding — `default-flow` assigning a possibly-absent worker, and two places in
  `merge-streams` dereferencing an unregistered socket while drawing its internal
  wiring. `merge-streams` was also passing `dataset.socketId` (a string) to a
  numeric lookup, which only worked because JS object keys coerce.

### Stage 3a — propagation and canvas (done)

- **§3.7 the bounded fixpoint loop is gone.** Socket formats now propagate through
  a worklist: seeded with every connection, re-queueing only the connections that
  touch a socket which just changed. O(E) amortised instead of a full O(E) sweep
  per change, and `Flow.lastPropagation` reports convergence, unresolved sockets
  and cycles instead of a `console.warn` that named nothing.
- `Flow.findCycles()` detects cycles with an iterative DFS. Reported, not
  prevented: a cycle is legal in a dataflow graph but usually a mistake.
- **§3.6 percentage positioning is fixed without a format change.** The real
  problem was that positions were percentages of the *container*, which resizes.
  They are now percentages of a fixed-size graph plane inside a transformed
  viewport — so resize translates instead of distorting, and the persisted JSON is
  untouched, meaning no migration for existing saved flows.
- Zoom and pan via `FbViewportService`, which holds state in signals with
  `transform` as a computed. Provided per `FlowBasedComponent`, so a nested flow
  has its own viewport. Wheel zooms at the cursor; background drag pans.
- The connection renderer converts client coordinates to plane space by dividing
  by the zoom. Without that the CSS transform is applied twice and lines drift
  from their sockets — which looks like plausible curves, so an e2e test measures
  the distance from each path's first point to the nearest socket centre at every
  zoom level. It stays at 1e-4 px.
- `pointerMoved` used `pageX/pageY` against client-space socket positions; they
  agree only on an unscrolled page.

### Stage 5 (partial) — editor features that do not need the signals redesign

- **Undo/redo** (`FbHistoryService`), capped at 50 deep-cloned snapshots. Cheap
  because a flow is already serializable JSON: no command log to keep in sync with
  the engine. Capture happens *before* mutations, since the engine edits in place,
  and once per drag rather than per pointermove frame.
- **Versioned save/load.** `FB_FLOW_FORMAT_VERSION` is 1 with a wired-but-empty
  migration table, so the first real format change cannot silently misread old
  files. Bare (pre-versioning) flows are still accepted; a newer format is refused
  with an explanation; shape errors name the path.
- **Validation surface.** The toolbar shows unresolved socket formats, cycles and
  non-convergence, sourced from `lastPropagation`. On the shipped fixture it
  immediately reports 5 sockets with no negotiated format — true all along, and
  invisible until now.
- **Searchable node palette**, sorted by visible title, matching title or registry
  key, with Enter picking a sole match.

### Stage 3b — signals (done)

**§3.4 is closed.** The library contains no `detectChanges()`, no `markForCheck()`
and no `setTimeout` any more.

The approach matters, because the obvious one is wrong here. `FbNodeState` *is*
the persisted JSON format — plain, serializable, mutable objects — and wrapping it
in signals would either destroy that property or force a conversion on every save
and load. So the state stays plain and the *revision* is reactive:

- `Flow` gained `FbChangeEmitter`, a synchronous emitter with no Angular and no
  RxJS, emitting `structure` / `connections` / `sockets` / `formats`. The engine
  stays framework-agnostic, which Stage 4 depends on.
- `FbGraphSignals` adapts those emissions into signal counters, plus a `geometry`
  counter the Angular layer bumps for node moves. Views read the counter they
  depend on — `layout()` for anything that draws a line — and an OnPush view that
  reads a signal is marked dirty automatically.
- Because the view now has a real dependency, the `state.x = [...state.x]`
  identity tricks are gone too: `*ngFor` diffs contents on every check, so an
  in-place mutation is picked up once the view is dirty.
- Local view state (`isFullSize`, `isLabel`, socket `active`/`isAccepting`) became
  signals. The socket flags were being written from an RxJS subscription under
  OnPush with no `markForCheck` at all — they only landed when some unrelated
  change-detection pass happened to run.
- The `setTimeout`s in `NodeService` became `afterNextRender`. That deferral is
  genuine, not a CD trick: `<fb-connection-lines>` precedes the `<fb-node>`
  children in the template, so measuring socket positions in the same pass reads
  the layout from before the nodes updated.

Converting `isFullSize` to a signal made the compiler point at two call sites that
had been reading the field without calling it — the kind of mistake a plain
boolean hides.

Verified by an e2e test that drags a node and asserts its connections follow,
measured as endpoint distance. If the geometry dependency were missing the node
would still visibly move while its lines stayed behind, which no build and no unit
test would catch.

### Stage 3b (part 2) — socket positions are computed, not measured

`FbGeometry` in the core now derives socket positions from the graph: node
position (a percentage of the plane) plus the node's rendered size plus the
socket's index in its group. The shell reports sizes from a ResizeObserver — the
one thing arithmetic cannot supply, because nodes size themselves to their
content — and everything downstream is maths.

The layout constants reproduce the shell's stylesheet exactly (`top: 6px`,
`height: calc(100% - 12px)`, `space-around`, and the left/right offsets), so this
changed nothing on screen. Measured against the real DOM at several zoom levels,
computed positions agree with actual socket centres to **0.015 px** — sub-pixel,
and the residue is the browser's own rounding in a flex column.

What that removes: `getBoundingClientRect` from the entire graph-connection render
path, the cached `_position` on every socket, and `SocketService.clearPosition()`,
which used to walk every registered socket — including ones belonging to destroyed
components — on every node move. Connection geometry is now deterministic and
testable without a browser.

The pointer for a pending connection is converted to plane space by the component
that owns the viewport, so the renderer works in one coordinate system
throughout. Only element-to-element lines still measure, and they must: they are
drawn between two arbitrary DOM nodes inside a single node's subtree, with no
graph position to compute from.

## Stage 4b — one editor instead of two

The Angular package is now a wrapper over the web-component shell rather than a
second implementation of it. `angularNodeMount` boots an Angular component into
the shell's host with a `NodeService` backed by `FbNodeApi`, so existing node
types are untouched. Deleted: NodeComponent, SocketComponent,
ConnectionLinesComponent, three drag-and-drop directives, DynamicComponentDirective
and four services — about 1,200 duplicated lines.

Two findings were only visible by looking at the running app, not by building it:

- **Shadow DOM silently ate node styling.** Node content was mounted inside
  shadow roots, which `document` stylesheets cannot match into. Material's M3
  styling is mostly custom properties, and those inherit across the boundary — so
  the cards looked right while `.material-icons` did not apply and every node icon
  rendered as clipped text. Nodes now render into the light DOM and are slotted
  into the plane.
- **Border vs. geometry.** An absolutely positioned child is placed against its
  containing block's padding box, so a border on the node host offsets every
  socket, while `FbGeometry` measures the border box. The frame moved to an inner
  element and the sockets stayed on the host, so the two share an origin by
  construction.

Also fixed: both Playwright web servers rebuilt `dist/flow-based-core`
concurrently, and a compiler reading it mid-write reported missing exports that
plainly existed. One build now, everything waiting on it.

### Debt paid off here
- **All three packages build in `partial` compilation mode again.** Full mode was
  forced by the `FlowBasedComponent` ↔ `NodeComponent` template cycle, since
  remote scoping exists only in full mode. The cycle went with `NodeComponent`,
  and with it the Angular-linker incompatibility.

## Stage 5 — editor features, and proving the extension point

Multi-selection (shift-click and marquee), group dragging, copy/paste/duplicate,
delete, align and distribute, with the usual keyboard shortcuts. The graph work
is in the core, so it is unit-tested without a browser and a React or Vue shell
inherits it.

`docs/NODE-AUTHORING.md` documents the extension point, and
`src/app/nodes/meter/meter.node.ts` demonstrates it: a node type written in plain
DOM against `FbNodeApi`, registered beside the Angular ones with `nodeMount()`,
running in the Angular demo. That turns "a node can ship as its own npm package"
into something the test suite checks. It also exercises the light-DOM decision
from Stage 4b — the node has no component and therefore no scoped styles, so it
is styled by the app's global stylesheet, which a shadow root would have blocked.

The fractal worker is now a real module worker. Rewriting it surfaced two bugs in
the promise wrapper: every `run()` leaked a `message` listener, and with two
computations in flight the first reply resolved both promises — one caller got
the other's image.

## Stage 6 — one notion of how open a node is

Three views, named `small`, `normal` and `full` — previously `small`, `medium`
and `large`. Both old spellings are still read, from a saved flow's `view` or a
node type's `views`, so nothing has to be rewritten to keep opening the way it
was left.

The interaction is now the same for every node type, and the shell owns all of
it: a small node carries no chrome and a double-click opens it, and an open one
has a header bar with its title, a settings button, the way back to small and the
way out to full. Deleting moved into that settings panel, beside the title and
the sockets it already edited — it used to be a button the *demo's* node chrome
drew, so a node type not written for that app could not be deleted from itself.

Every type gets all three views unless it narrows `views`. `full` was opt-in
first, on the reasoning that taking the whole surface is a claim only a node's
author can make. That read well and looked wrong: almost no type declared
anything, so the header showed two buttons on one node and three on the next for
no reason a user could see.

Behind it, two independent notions of how big a node is became one. `view` (the
shell) and `config.expanded` (the demo chrome) each thought they owned the answer
and disagreed: a single click left the shell at `small` while the chrome expanded
the node to 500px. `config.expanded` is now written *from* the view, and
`fb-normal-node` draws nothing — it only reports how open its node is.

Two bugs surfaced while checking it in a browser rather than in a test:

- A component's `@HostBinding` is refreshed by the view that *declares* it, not
  by its own change detector, so the chrome's class only appeared when something
  else happened to tick the parent. A node fed by a generator got it a second
  late and looked fine; a node with nothing on its inputs never got it at all.
- The node's title label sat inside the box, at `top: 100%` — which is exactly
  what the box's `overflow: hidden` clips. It had never been visible.

`FbNodeApi` gained `onViewChange`, and `NodeService` a `view$` to match, because
the view is no longer something content asks for and therefore already knows: the
shell changes it. `FbNodeHandle.update()` is finally called too — it had been in
the contract since it was written with nothing ever invoking it.

## Stage 7 — a drawing per view

A node type registers one component per view rather than one that branches:

```ts
component: { small: TapSmallComponent, normal: TapNormalComponent, full: TapFullComponent }
```

Three things follow, and they are the point.

**A view with no component is a view the node does not have.** `supportedViews`
takes its answer from which entries exist, so the header draws no button for a
view with nothing behind it. The demo's Meter says exactly this by having no
`full`: it is a reading against a range, and there is nothing it could do with
the surface it does not already do in a hundred pixels.

**Each drawing sizes itself.** The box's `min-width: 72px; min-height: 50px` is
gone — it was a guess at what a node ought to look like at rest, and wrong for
anything drawing a meter, a chart or one character. What is left is a 24px floor,
only so a node whose drawing failed is still something you can see and delete.

**Nothing is in the DOM that is not on screen.** The old shape was one component
holding every size at once, with `.minified` / `.expanded` sections and CSS
hiding all but one — which is why a collapsed node was still 500px wide.

`Tap` (the demo's Logger) is three Angular components over a shared `TapView`
base, and `Meter` is two plain-DOM mount functions — so the mechanism is shown to
be independent of the framework, not just of Angular's change detection. The
other nine types still register one component and are unaffected.

Also fixed while checking it: a `full` node's content was centred in the surface
rather than given it. The stretching has to happen on the `<slot>` — a drawing
sized `width: 100%` measures against its parent, and a slot that shrank to fit
capped the whole chain at the width of its own text. The content host itself is
deliberately left alone: a rule there would be an outer-tree declaration losing
to the node's own, which is the right way round.

## Stage 8 — controls that work inside a node

A slider in a node moved its thumb **and panned the whole canvas**, so the graph
slid away while you used it. `.fb-drag-ignore` was on the slider and the node did
read it — and then returned without stopping the event, which the canvas takes as
a background press. The node now stops every press that lands on it, including
the ones it declines to act on, which is what the canvas already documented it
was relying on.

The class is exported as `FB_DRAG_IGNORE`, and Angular authors get `fbNoDrag` and
`<fb-slider>`. That is the more interesting half: the contract was undocumented,
unnamed and silent when misspelled — the control still works and the editor runs
away — so leaving every node author to know a magic string was the actual defect.
`<fb-slider>` is a native range input with a `ControlValueAccessor`, carrying
`fbNoDrag` through `hostDirectives`; the package still has no UI dependency, and
the control grows a finger-sized thumb on a touch screen.

The demo's four Material sliders are gone with it, and `custom-code`, `fractal`
and `zoom-canvas` now say `fbNoDrag` instead of the string.

## Stage 9 — a connection is removed by holding it

Clicking a line deleted it on `pointerdown`: gone the instant you touched it,
with no way to change your mind and — on a touch screen, where there is no hover
— nothing beforehand to say a line was pressable at all. The first you knew of it
was a connection that had disappeared.

Now it is a press and hold. The line turns red and thickens over the half second
it takes, so it is its own progress bar and says what it is about to do while
there is still time to stop it. Letting go or sliding away calls it off.

Two things made that possible rather than merely nicer:

- **What you press is not what you see.** The curve is 3px, so hitting it meant
  landing within two pixels — awkward with a mouse, guesswork with a finger. An
  invisible 22px stroke follows the same path (44px on a coarse pointer), and the
  visible curve is `pointer-events: none`. The hover highlight is an
  adjacent-sibling rule between the two, so it costs no render.
- **The press deliberately does not stop propagating.** Until the hold completes
  it is an ordinary background press, so dragging from a line still pans — and
  moving is exactly what cancels the delete, which makes one gesture do both
  jobs without a mode.

The `line-click` event became `connection-remove`, since it no longer describes
a click, and the arming flag joins the `guard` key — otherwise the memoised
sub-template skips the very re-render that turns the line red.

## Stage 10 — sockets you can hit

A socket is a 14px dot, and connecting means hitting two of them. The dot stays
that size — it is a marker on the node's edge, not a button — so what grew is an
invisible circle around it: 30px with a mouse, 44px on a coarse pointer, as a
`::before` so an event inside it still reports the socket as its target.

It is **capped at the distance to the nearest socket on the same side**, which
the element measures and passes down as `--fb-socket-gap`. Sockets share a column
whose spacing is `(height - 12) / n`, so five of them on a short node sit four
pixels apart; a fixed target would quietly connect the wrong one, and a
connection made by mistake is worse than one that took two tries. The floor is
the dot itself, since at `full` view the dot is 42px.

The active socket — the one waiting for a partner — now grows 1.6× and takes a
halo as well as its colour. It is the one thing on screen the next click depends
on.

Sized with an explicit width rather than a negative `inset`, which is measured
from the padding box and came out six pixels short: the dot's border, counted
twice.

## Stage 11 — the Composite Unit becomes a Subflow

Renamed, and made usable. It was neither before: a fresh one had no sockets, no
children, and therefore **nothing to draw at all** — `contentSource()` always
returned a preview child, and an empty flow has none. It rendered an empty box,
and the component written to give it its first sockets never mounted, so those
buttons could not be found by anyone.

Four things, all of them the same idea — a subflow is a node until you go inside
it, and then it is the editor:

- **Empty, it draws its own type's icon.** `previewChild(state) ?? state`: the
  fallback is the thing itself.
- **`small` and `normal` are a node in the subflow**, which is what
  `previewChild` already did — one of its children standing in for it.
- **`full` is the flow itself**, with its connections. Unchanged: it is
  `editor.enter()`, navigation rather than a size.
- **A new subflow opens in full, with its settings up and its name selected**,
  because at small an empty one is an icon of nothing, the only reason to add one
  is to put something in it, and every one of them arrives called "Subflow".

**The header follows it onto the canvas.** Stepping a subflow to full removes its
node box, and everything the header offered went with it. The canvas now draws
the same bar for the flow it is showing: the path, its settings, and the way back
out. There is no "bigger" — full is where you are.

The breadcrumb's root reads `main` when the document has no title of its own —
it was showing the type name, the literal string `flow`. The demo's root was
titled "Random numbers", which described the two nodes it happened to contain, so
a subflow with nothing to do with them appeared under "Random numbers ›". It is
called `main` now: the document, not its contents.

That needed the settings panel to stop being part of the node box, so it is now
`<fb-node-settings>`. What it edits — a title and a set of sockets — is model
rather than anything about a node box, and this is what makes a subflow's own
sockets editable at all: its node box is not on screen when you are inside it.
Deleting is withheld there, since removing the ground you are standing on leaves
the editor showing a graph that is no longer in the document.

`DefaultFlowComponent` and its add-socket dialog are gone. The dialog duplicated
what the shell's panel does better — names, colours, reordering, removal — and
the component is now just the icon.

## Stage 12 — a socket sits on an edge, and you drag it there

`in` on the left and `out` on the right was never a rule, only a default —
`type` says which way the data goes, `side` says which edge it arrives at, and a
node whose input comes from above reads better with it on top. `FbSocket.side`
is `top | right | bottom | left`, absent meaning the default for its type, so
every saved flow reads exactly as it did.

- **Geometry groups by EDGE rather than by direction.** What shares an edge is
  what has to share the room along it, so `socketPosition` spreads each group
  along its own edge — down the height on the sides, across the width on the top
  and bottom.
- **The panel's border IS the node's outline.** Sockets are dots on the dialog's
  rim, dragged around it to another edge or further along the one they are on.
  Nearest edge wins, so a drop does not have to land on the border itself, and
  the move is committed once on release rather than once per pointermove. The
  alternative — a dropdown reading "top / right / bottom / left" — describes a
  picture instead of being one.
- **Curves leave and arrive along the edge.** The control points were purely
  horizontal, which was the same thing while every socket was on a left or right
  edge: those are the outward normals of those two edges. Stated as the rule it
  always was, a line into a top socket now drops in from above instead of
  arriving sideways as if it had missed.

Two bugs found by measuring rather than looking. `guard()` memoises each path on
a key that did not mention which edge its sockets were on, so the first fix to
the curve shape changed nothing — the old path was reused, 50px from the socket.
And the test that was meant to catch it sampled the tangent 20px back along the
arc, where a hard-turning cubic has already swung off its final direction; at 3px
the same curve reads 0.4 across against 3 down.

## Stage 13 — a socket is edited by pressing the socket

The panel carried a list of socket rows AND the dots on its rim, which said
everything twice — and the row was the copy that could not show which edge its
socket was on. The list is gone. What is left is two buttons, `+ in` on the left
and `+ out` on the right because that is where those sockets appear, and the dots
themselves for everything else.

A press that never travelled is a tap and opens that socket's own dialog — name,
direction, colour, remove. One that did is a move around the rim. Both start with
the same pointerdown, so the difference is made on release with a few pixels of
slop, exactly as a node's own click/drag is.

The socket's dialog STATES its direction rather than offering it. Making it
editable was my mistake and was reverted: an `in` is always an `in`, and every
connection through it was formed on that promise.

The socket dialog is titled **Socket in** or **Socket out**, and the dot it came
from **stays lit** in the same amber the shell uses for a socket waiting to be
connected. The dialog covers the middle of the panel and a new socket has no
name yet, so without both there was nothing saying which socket was being edited.

**Every socket draws an arrow**, and it turns with the edge it sits on — an `in`
on the top of a node points down into it, an `out` on the bottom points down out
of it. Colour cannot carry this: it comes from a socket's `format`, so two
sockets of the same format are the same colour whichever way they point, and a
colour is optional anyway. It is an aid for telling sockets apart while
configuring a node, not how the graph is read.

## Stage 14 — a socket can carry more than one type

`format` is what a socket HAS; `formats` is the set it MAY have. One type is
stored as the plain `format` the engine has always negotiated, so a socket with a
single type is indistinguishable from one written before this existed — in the
JSON as much as in the code. An empty set still means "anything", which is what
an absent format has always meant.

Compatibility becomes overlap rather than equality (`formatsCompatible`), and a
connection whose overlap is exactly one type settles both ends on it — two
overlapping sets still leave a real choice, and guessing is worse than leaving it
for the next connection to settle. Retyping a socket cuts the connections its new
set cannot carry (`Flow.pruneIncompatible`).

**The vocabulary is per flow, and a subflow has two sides.** A type exists only
where something carries it, so which types are on offer depends on which side of
a boundary a socket faces — and a subflow is a node in one flow and a flow of its
own:

- its **inputs** take whatever the flow it sits in produces, because a sibling
  out there is what will feed them;
- its **outputs** carry whatever its own children produce, because that is where
  the values come from.

An ordinary node has one side and takes the vocabulary of the flow it is in.
`formatsFor(node, socket)` is where this is decided; `vocabularyOf` counts a
flow's children's sockets and deliberately not its own, since a flow's own
sockets are its boundary rather than something inside it. That is what keeps a
subflow's types its own: they reach the outside through its outputs, and nothing
reaches in but through its inputs.

## Stage 15 — a half-drawn connection has something to pick it up by

Tapping a socket starts a connection and the line follows the pointer, but a
finger that lifts left it hanging in mid-air with nothing to grab: the only way
to move it again was to press the canvas, which pans the graph and drags the line
along behind it.

The loose end now carries a handle — press it and only the line moves, let go
over a socket and the connection is made, which is the gesture people try first
anyway. Both ways still work: tapping a second socket connects as before.

What is under the pointer is found through the editor's geometry
(`FbEditor.socketAt`) rather than the document. A socket lives in its node's
shadow root and `elementFromPoint` stops at the host, so hit-testing the DOM
returns the node and never the dot on it — and every socket's position is
computed here anyway, which makes the model both the easier and the exact answer.
Its radius is generous: dropping a connection means aiming at a 16px dot with a
line already under your finger, and the cost of missing is losing the connection
you were drawing.

## Stage 16 — Merge streams has no full view

It draws its own lines — socket to value card, card to output — with `api.wire`,
and those are MEASURED between elements rather than computed from the graph. On
the whole surface its cards landed hundreds of pixels from the sockets they
belong to, which are pinned to the editor's edges, so every line became a long
sweep across an empty middle. What it has to show fits in a panel, so it declares
`views: ['small', 'normal']`.

The lines are drawn when the node OPENS now. They used to hang off `maxSize`,
which fires for the full view — so removing that view would have left them never
drawn at all. And they are redrawn when the cards change: a card exists per
value, so every line is stale the moment its card is replaced. That subscription
was already there, with an empty body.

## Stage 17 — a node's own lines stop at its elements

Three things made the merge node look like a scribble.

**The lines were drawn centre to centre**, so half of each one was buried inside
the elements it joined — it ran straight over the numbers it was pointing at.
They stop at the EDGE now, on the side the other element is on, and both control
points push away from their own box rather than assuming the line runs left to
right.

**Sockets are spread over a node's CONTENT, not its whole box.** An open node
carries a header, so a column of inputs started below where the sockets did and
every line had to drop across to meet its card. `FbGeometry` takes a
`contentTop` with the measured size and insets the left and right edges by it;
the top and bottom are untouched, since nothing is in the way there. Zero for a
node at rest, which is every node without a header.

**And the node drew each line twice.** It cleared immediately and added a frame
later, so two calls in quick succession — a value arriving as the node opens —
cleared once and added twice. The clear moved inside the timeout, and a pending
one is cancelled first.

The merge node's own layout follows the same `space-around` rule the sockets do,
so card i sits opposite socket i however many inputs are added in the settings.

### Still open
- **`FlowWorker.destroy()` is a stub** — literally `console.log`. A removed
  subflow does not unsubscribe its streams. `removeStream` still carries a
  `TODO: Is if needed`.
- **`a drag does not cost work proportional to the size of the graph` is flaky**,
  around one run in five even with a single worker. Measured, not guessed: the
  ratios it asserts came out 2.66 / 2.74 / 3.73 against a limit of 4 before Stage
  9 and 2.82 / 2.49 / 3.14 after, so the extra path per connection is not the
  cause. The denominator is a ~0.15 ms measurement, small enough that noise in it
  moves the threshold more than a real regression would — which the test's own
  comment predicted. Best of three runs is not enough; it needs a floor under the
  fast measurement, or to assert absolute work rather than a ratio.
- `ng lint` reports 0 errors but ~265 warnings, concentrated in four families
  (`no-explicit-any`, `prefer-inject`, `prefer-control-flow`,
  `no-empty-function`) that Stages 3–4 remove. `config: any` is the big one: node
  configs are untyped by design today, and giving `FbNodeType` a generic config
  parameter is the real fix.
- `FlowBasedService` is still a root singleton holding one `Flow` and a flow
  stack, so two independent editors on one page would still fight (§3.2). Making
  it component-scoped belongs with the Stage 3 rework.
