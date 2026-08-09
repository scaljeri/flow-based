---
name: ship
description: Release a change — test, commit, push the working branch, deploy to the playground, verify against the live site and restore the local build. Use when a change is functionally complete or when it needs to be visible at playground.calje.eu/fbp.
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
contention the suite rotates failures, usually the drag-performance and
map-highlight tests. A test that fails in isolation is a defect.

If the change touched a **lit** library, run `node scripts/build-lit-demo.mjs`
first. `build:e2e` lives in the port-4200 web-server command, which Playwright
skips when a server is already running, so the shell under test can otherwise
be an old build.

## 2. Commit

Work on a branch. The message states what changed and **why the previous
behaviour was wrong** — the same standard the code comments are held to.

## 3. Deploy

```bash
set -a; . ./.env; set +a; npm run deploy
```

Run the script, never its steps. `ng` is not on the PATH outside an npm script,
and a hand-assembled build ships root-relative assets that fail on the deployed
sub-path.

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

## 5. Report

The result first: what was verified and how, and what was skipped and why. The
commit already records the steps.
