---
name: module-add
description: Add a node module or a node type to flow-based — a new lazy workspace package under projects/, or a new type inside an existing module. Use when a new kind of node is wanted, when a module needs a new format, or when node types must be renamed or split.
---

# Adding a module or a node type

A module is ONE exported `FbModule {name, prefix, formats?, types}`, built as a
workspace package and loaded behind a dynamic import so it gets its own chunk.

## A new module — the checklist

1. `projects/flow-based-X` with `package.json`, `ng-package.json`,
   `tsconfig.lib.json` + `.prod`, `src/public_api.ts`, `src/lib/index.ts`
   exporting the `FbModule`.
2. An `angular.json` project entry — copy the graphs one.
3. Root `tsconfig.json` paths → `dist/flow-based-X`.
4. `LOADERS` and the `modules` list in `src/app/modules.service.ts`.
5. The `build:lib` chain in `package.json`.
6. `modules.enable(...)` in app.component's fresh-browser path if a seeded flow
   needs it.

Every component in a module must be `standalone: true` — declaring it in
app.module drags the lazy chunk into the main bundle — and therefore cannot use
module-scoped directives without importing them.

## A new type

- Register it under `types` with its settings (`group`, `title`, and the
  per-view components). A view with no component does not exist for that type;
  each defines its own size.
- The worker is constructed as `new Worker(state.config, state.sockets)` — not
  from the node state. Persist by mutating the config object in place.
- Give it `setConfigValue` if a document should be able to tune it from prose.
- A leaf node must never gain `connections: []`; the engine reads that field's
  presence as "this is a flow".
- A control inside a node must stop the press (`fbNoDrag` / `FB_DRAG_IGNORE`),
  or the canvas drags instead.

## Formats

Identity is the DESCRIPTION, not the name: two modules declaring `point` with
the same description share it, a different description gets the newcomer's
sockets renamed to `prefix:name`. Declare `refines` only for a genuine
refinement — it is directional and never works in reverse.

**Nothing executable on a wire.** A function travels as its expression string.

**Nothing case-specific.** If a fact will not generalise — a publisher's field
name, a vocabulary, a colour per sector — the generic version goes in the module
("read this path from what arrived") and the specific string goes in the flow.

## Renaming or splitting a type

Saved flows exist in browsers you cannot reach. A rename needs a migration step
in `serialization.ts` keyed by the from-version, and `FB_FLOW_FORMAT_VERSION`
goes up by one. A split must keep the old node's id and its wired sockets on one of
the halves, and mint fresh ids from `highestId(flow)` for the other.

## Finish

Unit-test the worker, e2e the node in a flow, and load an OLD-format flow on the
deployed site to prove the migration. Then [[ship]].
