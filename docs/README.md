# Documentation

## Extending the editor

Read these in order. The first is enough to write a node; the second is enough to
ship a bundle of them.

| | |
| --- | --- |
| [WIRES.md](WIRES.md) | **What a wire is.** The connection semantics every node stands on: latest-value, fan-in interleaves, fan-out copies, moments as packets, cycles need a unit-delay. Read it before writing a worker. |
| [NODE-AUTHORING.md](NODE-AUTHORING.md) | **Writing one node type.** The mount contract, the worker, views, sockets, and the rules about controls versus dragging. Framework-free throughout — Angular is one way to draw a node, not a requirement. |
| [MODULES.md](MODULES.md) | **Writing a module**: a bundle of node types that joins a running editor. What you export, how formats and collisions work, what to build, and the registrations the app needs today. Its example is compiled by `npm run check:docs`. |
| [MODULES-FROM-A-URL.md](MODULES-FROM-A-URL.md) | **Loading a module from a URL** — what is built, and what a community server would still need, including the part with no clever answer: running a stranger's code. |

## Design and history

| | |
| --- | --- |
| [TYPE-SYSTEM-PLAN.md](TYPE-SYSTEM-PLAN.md) | How socket types were made to carry meaning — refinements, identity by description, and the collision rules the format registry implements. |
| [AUDIT.md](AUDIT.md) | The 2026-07-30 architecture audit and the staged modernisation roadmap it produced. |
| [MIGRATION-CHECKLIST.md](MIGRATION-CHECKLIST.md) | The Angular 7 → 22 migration, decision by decision. |
| [tsc.md](tsc.md) | Loose TypeScript notes. |

## Checking the docs

```
npm run check:docs
```

Extracts every ` ```ts check ` block from the documentation, compiles it against
the **built** packages in `dist/`, and fails if anything has drifted. A wrong
example is worse than no example: it is read as the contract, and the reader
spends their first hour discovering it was never true.

Run `npm run build:lib` first — there is nothing to check against otherwise.
