# flow-based

An Angular library for flow-based programming (`projects/flow-based*`), a
framework-free web-component shell (`flow-based-lit`), lazy node modules
(`-math`, `-graphs`, `-network`, `-data`), and a demo app in `src/app` that
doubles as the showcase at <https://playground.calje.eu/fbp/>.

This file is the contract. It is loaded every session, so it holds only what
must never be looked up: the commands, the rules, and what "done" means.
Everything discovered — why a thing is the way it is, what broke once, what a
publisher's data looks like — lives in memory, one fact per file.

## Commands

| | |
|---|---|
| `npm run build:lib` | the libraries, in dependency order. Required before a demo build resolves. |
| `npm run build:demo` | libraries + demo app + playground modules into `dist/demo/browser`. |
| `npm test` | unit tests (core, flow-based, demo). |
| `npm run lint` | every project. |
| `npx playwright test` | e2e. `-g "<name>"` for one. |
| `set -a; . ./.env; set +a; npm run deploy` | build with base-href `/fbp/` and upload. |

Port 4200 is a **static** server over `dist/demo/browser`, not `ng serve`. So
anything served locally is only as fresh as the last `build:demo`.

## Must

- **`npm run build:demo` after every deploy.** The deploy leaves `dist` built
  with base-href `/fbp/`, so localhost 404s every asset until it is rebuilt, and
  e2e then fails on things unrelated to the change.
- **Every fix gets a test, named after the failure it prevents** — "a figure can
  decline the top of the screen", not "test figure 2". A fix without one is a
  fix that comes back.
- **A trap a test cannot catch gets one line, immediately** — here if it always
  applies, otherwise in the matching trap memory.
- **Lint, unit and e2e green before a commit.** If something is red, say so
  plainly and first; a re-run alone tells a flake from a failure.
- **Screenshot a UI change against the deployed URL**, not a local build.
- Run the npm script, never its steps by hand: `ng` is not on PATH outside one.

## Must not

- **No secrets in a node's config.** A flow's JSON is downloaded, shared and
  embedded. That is why the Request node has no API-key field, and it must stay
  that way.
- **Nothing executable on a wire.** Only data, possibly as arrays. A function
  travels as its expression string; consumers compile it themselves.
- **No case specifics in the editor or its modules.** TNO/TOPAS is one case;
  its names, its vocabulary and its defaults belong in a flow, not in
  `projects/`.
- **Opening a flow must not run a module this browser has never seen.** A flow
  is a file; that would be a drive-by.
- **Never push `master`** without asking. Work happens on a branch.
- **No new dependency** without asking.

## House style

The code is meant to be readable by whoever arrives next, which includes me in
a fresh session.

- **A comment says WHY, and what broke.** Not what the line does — that is what
  the line is for. A comment that records a past failure keeps the symptom in
  it ("every citizen sensor was asked for under `lml` and 404'd"), because the
  symptom is what makes the next person recognise it.
- **State the decision where it is made.** A non-obvious choice — an order, a
  cap, a default — gets a sentence at the point of the choice, including what
  the alternative would have cost.
- **Names read as language.** `stationsToDraw`, `keepTop`, `pickFirst`.
- **Tests are claims about behaviour.** The name is the claim; the comment above
  it is why the claim matters.
- Match the file you are in: comment density, naming, idiom.

Prose in a flow's *document* is a different register with the same intent —
scientific, a bit enthusiastic, short, every number sourced, no plumbing on the
page. The `doc-write` skill has the whole of it.

## Done means

Tested, lint-clean, committed, pushed to the working branch, deployed, and
verified against the live URL — then `build:demo` to restore the local dist.
Say what was skipped, if anything was.
