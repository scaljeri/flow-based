# flow-based

An Angular library for flow-based programming (`projects/flow-based*`), a
framework-free web-component shell (`flow-based-lit`), lazily loaded node
modules (`-math`, `-graphs`, `-network`, `-data`), and a demo application in
`src/app` that doubles as the showcase at <https://playground.calje.eu/fbp/>.

This file is the working contract for the repository: the commands, the rules
that hold everywhere, and what counts as finished. Background and the reasoning
behind individual decisions belong in the code comments and in `docs/`.

## Commands

| Command | Does |
|---|---|
| `npm run build:lib` | Builds the libraries in dependency order. Required before a demo build can resolve them. |
| `npm run build:demo` | Libraries, demo application and playground modules into `dist/demo/browser`. |
| `npm test` | Unit tests (core, flow-based, demo). |
| `npm run lint` | Every project. |
| `npx playwright test` | End-to-end tests. `-g "<name>"` runs one. |
| `npm run check:docs` | Compiles the `ts check` blocks in `docs/`. |
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
  path from what arrived"); the specific string goes in the fixture.
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

Then two closing steps, in this order.

**Record what was learned.** Anything discovered during the work that will be
needed again is written down before the work is called done — while it is still
in hand. A defect becomes a test named after it; a hazard no test can catch
becomes one line here or in the notes for that area; a decision becomes a
comment where the decision lives. Nothing worth keeping is left in a
conversation, a terminal or a memory.

**Then prune.** Written knowledge grows and does not shrink by itself, and every
line of it competes with the work for attention. So the last pass asks what can
now go: a rule a test or the linter enforces on its own; a note describing code
that no longer exists; a hazard that has been designed out; two entries saying
the same thing. Delete what is wrong — an instruction that is confidently out of
date costs more than a missing one. If nothing can go, say so; that is a result
too.
