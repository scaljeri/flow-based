---
name: module-add
description: Add a node module or a node type — a new lazily loaded workspace package under projects/, or a new type inside an existing module. Use when a new kind of node is needed, when a module needs a new wire format, when node types are renamed or split, or when a saved-flow migration or format-version bump is needed.
---

# Adding a module or a node type

A module is a single exported `FbModule {name, prefix, formats?, types}`, built
as a workspace package and loaded behind a dynamic import so that it occupies
its own chunk.

## A new module

1. `projects/flow-based-X` containing `package.json`, `ng-package.json`,
   `tsconfig.lib.json` and `.prod`, `src/public_api.ts`, and `src/lib/index.ts`
   exporting the `FbModule`.
2. An `angular.json` project entry — copy the graphs one.
3. Root `tsconfig.json` paths mapping the package name to `dist/flow-based-X`.
4. `LOADERS` and the `modules` list in `src/app/modules.service.ts`.
5. The `build:lib` chain in `package.json`.
6. `modules.enable(...)` in the application's fresh-browser path, if a seeded
   flow requires the module.

Every component in a module must be `standalone: true`; declaring it in
`app.module` would pull the lazy chunk into the main bundle. It therefore cannot
rely on module-scoped directives without importing them.

## A new type

- Register it under `types` with its settings: `group`, `title` and the
  per-view components. A view with no component does not exist for that type,
  and each component defines its own size.
- The engine constructs a worker as `new Worker(state.config, state.sockets)`,
  not from the node state. A worker that must persist something mutates its
  configuration object in place.
- Implement `setConfigValue` if a document should be able to change the node's
  configuration from its prose.
- A leaf node must never be given `connections: []`; the engine treats the
  presence of that field as "this node is a flow".
- A control inside a node must stop the press (`fbNoDrag` / `FB_DRAG_IGNORE`),
  or the canvas is dragged instead.

## Formats

A format's identity is its **description**, not its name: two modules declaring
`point` with the same description share it, while a different description causes
the newcomer's sockets to be renamed to `prefix:name`. Declare `refines` only
for a genuine refinement — the relation is directional and never holds in
reverse.

Nothing executable travels on a wire: a function is carried as its expression
string.

No case-specific knowledge belongs in a module. If a fact will not generalise —
a publisher's field name, a domain vocabulary, a colour per category — the
module takes the generic form ("read this path from what arrived") and the
specific string lives in the flow.

## Renaming or splitting a type

Saved flows exist in browsers that cannot be reached. A rename requires a
migration step in `projects/flow-based-core/src/lib/serialization.ts`, keyed by
the version it migrates from, and `FB_FLOW_FORMAT_VERSION` is raised by one. A split keeps the original node's id
and its wired sockets on one of the halves and mints fresh ids from
`highestId(flow)` for the other.

## Finishing

Unit-test the worker, exercise the node end-to-end inside a flow, and load a
flow in the previous format on the deployed site to prove the migration. Then
follow the `ship` skill.
