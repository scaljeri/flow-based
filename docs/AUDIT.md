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
