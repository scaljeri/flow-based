---
name: ship
description: Release a change — test, commit, push the working branch, deploy to the playground, verify against the live site and restore the local build. Use when a change is functionally complete or when it needs to be visible at playground.calje.eu/fbp (Dutch cues - "zet het live", "publiceer", "deploy maar").
---

# Ship

Turning a working change into a published one. The order matters, and two steps
are easy to skip in a way that breaks the next piece of work rather than this
one.

## 1. Prove it

```bash
npm run lint
npm test
npx playwright test
```

A failure is reported plainly and first. Before treating one as an environment
flake, run that test alone (`-g "<name>"`) and check the load average: under
contention the suite rotates failures, usually "a drag does not cost work
proportional to the size of the graph" and "a clicked place stays marked on the
map, including across a redraw". A test that fails in isolation is a defect.

If the change touched a **lit** library, run `npm run build:lit-demo` first —
it rebuilds the lit library and re-bundles the harness. The bare bundling
script only re-bundles whatever already sits in `dist/flow-based-lit`, and
Playwright reuses a running server, so the shell under test can otherwise be an
old build.

## 2. Commit

Work on a branch. The message states what changed and **why the previous
behaviour was wrong** — the same standard the code comments are held to.

## 3. Deploy

```bash
set -a; . ./.env; set +a; npm run deploy
```

## 4. Verify, then restore the local build

```bash
npm run build:demo
```

Required every time: the deploy leaves `dist/demo/browser` built with base-href
`/fbp/`, so anything served from that directory afterwards fails to load its
assets, and the next test run fails for reasons unrelated to the change.

Verification is against <https://playground.calje.eu/fbp/>, not a local server.
A throwaway Playwright spec that navigates there, asserts the behaviour that
changed and captures a screenshot is the quickest honest check; delete it
afterwards.

## 5. Record and prune

Close per "Finished means" in `CLAUDE.md`: write down what the work taught,
then remove what the written layers no longer need.

## 6. Report

The result first: what was verified and how, and what was skipped and why. The
commit already records the steps.
