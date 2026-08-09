---
name: ship
description: Finish and publish a change on flow-based — test, lint, commit, push the working branch, deploy to the playground, verify live, and restore the local dist. Use when a task is functionally complete, when the user says it can go live, or whenever a change needs to be visible at playground.calje.eu/fbp.
---

# Ship

The procedure that turns a working change into a published one. It exists
because the order matters and two of the steps are easy to forget in a way that
silently breaks the NEXT thing.

The site is the only place most people see this project, so a change nobody can
look at is not finished.

## 1. Prove it

```bash
npm run lint
npm test
npx playwright test
```

A red test is reported plainly and first. Before calling anything a flake,
re-run that one test alone (`-g "<name>"`) and check `uptime`. On a small
machine the suite rotates failures above load ~5; the drag-perf and
map-highlight tests are the usual casualties. A test that fails alone is a
failure.

If the change touched a **lit** library, `node scripts/build-lit-demo.mjs`
first: `build:e2e` lives in the :4200 webServer command, which is skipped when a
server is already running, and a stale shell has passed fifty tests before.

## 2. Commit

Branch, never `master`. The message says what changed and **why it was wrong
before** — the same standard as a comment. End with the Co-Authored-By and
session trailers.

```bash
git add -A && git commit -F - <<'MSG'
…
MSG
git push origin <branch>
```

## 3. Deploy

```bash
set -a; . ./.env; set +a; npm run deploy
```

Run the script, never its steps: `ng` is not on PATH outside an npm script, and
a hand-rolled build ships root-relative assets that 404 on the live site.

## 4. Verify live, then restore the dist

```bash
npm run build:demo
```

**Do this every time.** The deploy leaves `dist/demo/browser` built with
base-href `/fbp/`, and port 4200 serves that directory statically — so until it
is rebuilt, localhost 404s every asset and the next e2e run fails on something
unrelated to the change.

Verification is against `https://playground.calje.eu/fbp/`, not localhost. A
throwaway Playwright spec that navigates there, asserts the thing that changed
and takes a screenshot is the fastest honest check; delete it afterwards.

## 5. Report

Result first: what was verified and how, and what was skipped and why. No
summary of the steps — the commit says those.
