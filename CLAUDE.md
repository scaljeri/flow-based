# flow-based

An Angular library for flow-based programming (`projects/flow-based*`), a
framework-free web-component shell (`flow-based-lit`), lazily loaded node
modules (`-math`, `-graphs`, `-network`, `-data`), and a demo application in
`src/app` that doubles as the showcase at <https://playground.calje.eu/fbp/>.

This file is the working contract for the repository: the commands, the rules
that hold everywhere, and what counts as finished. Background and the reasoning
behind individual decisions belong in the code comments and in `docs/`.

## Map

| Piece | Path | Is |
|---|---|---|
| Engine | `projects/flow-based-core` | Framework-free: the flow graph (`flow.ts`), save/load and migrations (`serialization.ts`, `FB_FLOW_FORMAT_VERSION`), the inline prose parser (`inline.ts`). |
| Shell | `projects/flow-based-lit` | Web components on core alone — canvas, nodes, connections, the document renderer (`document-element.ts`). No Angular. |
| Angular wrapper | `projects/flow-based` | Hosts the shell; owns the module and format registry (`module-registry.ts`). Never duplicate what the shell already does. |
| Standard palette | `projects/flow-based-basics` | The set every editor starts with — value, clock/trigger/gate, tap, script, stats, meter, the state cells, the subflow and its flow-param. A host spreads `BASICS_TYPES` into its registry; not a lazily loaded module. |
| Node modules | `projects/flow-based-{math,complex,graphs,network,data}` | Lazily loaded chunks, registered via `src/app/modules.service.ts`. `complex` is the imaginary-numbers article's machinery — the proof that one subject's nodes ship as a module a flow asks for. |
| Demo | `src/app` | The application, with its seeded flows in `src/app/fixtures.ts`. |

Build order is core → lit → flow-based → basics → modules; `npm run build:lib` encodes
it. End-to-end tests use two servers: port 4200 serves the Angular demo
(`e2e/smoke.spec.ts`), port 4400 the lit harness (`e2e/lit-shell.spec.ts`).

## Commands

| Command | Does |
|---|---|
| `npm start` | Builds the libraries, then serves the demo on port 4200. |
| `npm run build:lib` | Builds the libraries in dependency order. Required before the demo can build or its tests can resolve them — including on a fresh clone. |
| `npm run build:demo` | Libraries, demo application and playground modules into `dist/demo/browser`. |
| `npm test` | Unit tests (core, flow-based, demo). |
| `npm run lint` | Every project. |
| `npx playwright test` | End-to-end tests. `-g "<name>"` runs one. |
| `npm run check:docs` | Compiles the `ts check` blocks in `docs/MODULES.md` — the only file it reads; a new doc with checked blocks joins `DOCS` in `scripts/check-doc-examples.mjs`. |
| `npm run deploy` | Builds with base-href `/fbp/` and uploads. Needs `ACCESS_TOKEN`; see `.env.example`. |

Always run the npm script rather than the steps inside it: `ng` is not on the
PATH outside one, and a hand-assembled build produces root-relative assets that
fail on the deployed sub-path.

## Requirements

- Every fix carries a test named after the failure it prevents — "a figure can
  decline the top of the screen", not "figure test 2". A fix without one is a
  regression waiting to happen.
- A hazard no test can catch is documented in one line, at the time it is found,
  in this file if it always applies.
- Lint, unit tests and end-to-end tests pass before a commit. A failure is
  reported plainly and first; re-running a single test distinguishes an
  environment flake from a defect.
- A user-interface change is verified against a real build, not a development
  server.
- After a deploy, run `npm run build:demo`. The deploy leaves
  `dist/demo/browser` built with base-href `/fbp/`, so anything served from that
  directory afterwards fails to load its assets.

## Prohibitions

- **No credentials in a node's configuration.** A flow is serialised to JSON and
  is downloaded, shared and embedded. This is why the Request node has no
  API-key field, and it must stay that way.
- **Nothing executable on a wire.** Only data, possibly in arrays. A function
  travels as its expression string and consumers compile it themselves.
- **No case-specific knowledge in the editor or its modules.** A demo's data
  source is one case: its field names, its vocabulary and its defaults belong in
  a flow, never in `projects/`. The generic form goes in the module ("read this
  path from what arrived"); the specific string goes in the flow — for shipped
  demos, in `src/app/fixtures.ts`.
- **Opening a flow must not execute a module the browser has never seen.** A
  flow is a file, and doing so would be a drive-by execution.
- **No new dependency without agreement.**

## Code style

The code is written to be understood by whoever reads it next.

- A comment explains **why**, and what went wrong before — not what the
  statement does. A comment that records a past defect keeps the symptom in it,
  because the symptom is what makes it recognisable the next time.
- A non-obvious decision is stated where it is made: the order, the cap, the
  default, and what the alternative would have cost.
- Names read as language: `stationsToDraw`, `keepTop`, `pickFirst`.
- A test name is a claim about behaviour; the comment above it explains why the
  claim matters.
- Match the file you are working in — its comment density, its naming, its
  idiom.

Prose in a flow's *document* is a different register with the same intent:
scientific, unadorned, short, every figure earning its place. The `doc-write`
skill covers it.

## Finished means

Tested, lint-clean, committed to a working branch and — if it ships — deployed
and verified against the live site, with `npm run build:demo` afterwards to
restore the local build. Anything skipped is stated explicitly.

Before the work is called done, what was learned during it is written down —
a defect as a test named after it, a hazard no test can catch as one line here,
a decision as a comment where the decision lives — and anything this file or
the docs no longer need is removed. Written knowledge only grows unless
something takes from it.
