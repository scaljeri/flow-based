# Loading a module from a URL

**Status: built.** Paste a URL into the Modules dialog and it loads, joins the
palette, and is remembered. This deployment also hosts a few modules itself —
`playground/modules/*.ts`, published beside the app and offered in the dialog
with one click — which stands in for a server for now. What is *not* built is
everything else a community server would add: uploads, versioning, discovery,
and any answer at all to running a stranger's code.

For how to write such a module, see [MODULES.md](MODULES.md#the-other-way-a-module-from-a-url).

---

## What it does today

```ts
const namespace = await import(/* @vite-ignore */ url);
const module = namespace.default ?? Object.values(namespace).find(looksLikeModule);

Object.assign(this.types, prepareModule(module, this.formats).types);
```

Around those three lines, in `ModulesService`:

- **The URL is remembered, not just the module.** `localStorage` under
  `fb-modules`, which grew from a bare array of enabled ids to
  `{version: 2, enabled, urls}` and still reads the old array.
- **A fetched module appears in the list even when disabled**, so switching it
  off does not mean finding it again.
- **It names itself.** The row shows the module's own `name` and `description`,
  not the address it came from. `description` was added to `FbModule` for this.
- **Failures are reported on the row.** Unreachable, blocked by CORS, or a URL
  that loads fine and exports no module — the last one being the typo people
  actually make. A dialog that silently does nothing is the worst answer.
- **Forget removes it entirely**; the four shipped modules cannot be forgotten.
- **The warning sits next to the field**, not in this file: a module is code
  running in this page, with the flows in this browser within reach.

And in the flow itself:

- **A flow records the fetched modules it needs** — `config.modules` on the root,
  written on every save and on download. A type name says which *shipped* module
  it belongs to; nothing about `greet-hello` says where on the internet to find
  it.
- **Opening a flow does not run a module the reader has never seen.** A flow is a
  file, files arrive by email, and a document that fetched and executed a script
  from a stranger's server merely by being opened is the shape of a drive-by. A
  URL this browser already holds is loaded; an unknown one is *listed*, switch
  off, next to the warning, and the nodes that need it draw as empty boxes until
  somebody turns it on — which is honest, because they are missing something.

  Worth stating because the first version of this got it wrong in a way that read
  as correct: the declared-URL loop asked for consent, and two statements later
  the prefix loop — the one that enables shipped modules by their type names —
  matched the fetched module too and ran it. Consent is not a property of one
  branch. Every path that can load has to hold it, which is what the test now
  measures by counting requests.

- **The playground is its own server for now.** `npm run build:playground`
  bundles each module in `playground/modules` and generates
  `modules/index.json` by importing what it built and asking it what it is. The
  dialog offers those, and adding one takes the same path a stranger's module
  would — which is what keeps that path honest: if it breaks, it breaks for us
  first.

Covered by four end-to-end tests, one of which uses the real published file with
nothing intercepted. The fixture in them imports nothing at all,
which is the proof of the claim that a module needs nothing from the editor at
runtime.

---

## What is deliberately not done

### 1. Angular components still cannot travel this way

A module whose drawings are Angular components carries compiled component
definitions, and loading one from a URL means the remote bundle and the host app
must share **one** Angular runtime — same version, same instance. Two copies do
not co-operate.

That is solvable with import maps or module federation, and it is a large amount
of machinery. The framework-free path has none of the problem: `FbNodeMount` is a
function, and rxjs — the only other shared runtime — tolerates two copies,
because nothing in the editor tests an Observable with `instanceof`.

So **community modules should be framework-free**, and the docs say so rather
than letting people discover it after writing one.

The honest next step is to make that path *nice* rather than merely possible.
Today an author writing plain DOM gets no help with layout, controls, or the
styling every other node has. A small `@scaljeri/flow-based-kit` of
framework-free building blocks — a labelled value, a slider that already carries
`FB_DRAG_IGNORE`, a chart box — would make the simple path the pleasant one too.

### 2. Running a stranger's code

This is the part with no clever answer, and nothing built so far improves it.

A module is JavaScript, loaded into the same page as the editor, with the same
access to the DOM, `fetch`, and `localStorage` — which is where flows are saved.
A malicious module can read every flow the reader has and post them anywhere.
Nothing about `FbModule` limits that, and inspecting the `types` object would not
either, because the harm happens at import time.

Real options, in increasing order of cost:

| Approach | Buys | Costs |
| --- | --- | --- |
| Curation only — the server publishes what its owner reviewed | Trust in a person, which is a real thing | Does not scale, and reviewing minified code is not review |
| Worker isolation — the module's *workers* run in a Web Worker | Data cannot reach the DOM or storage directly | Every worker becomes async; drawings still run in the page |
| `<iframe sandbox>` per module, postMessage protocol | A real boundary | A large rewrite of the mount contract; drawings become remote |
| Signing + a per-module permission prompt | Informed consent | Prompts are clicked through; signing proves origin, not intent |

For a community server the answer is probably a **combination**: curation for a
verified shelf, and the plain statement for everything else. Today the app has
the statement and no shelf.

Worth noting: the Network module already refuses to hold credentials, for exactly
this family of reasons — a node's config travels with the flow, so a secret in
one leaks three ways. Arbitrary code has the same shape of problem, one level up.

### 3. Versions

Two readers open the same flow with `weather.js` at two different revisions, and
the flow means two different things. `config.modules` stores a URL and nothing
else, which is enough only because the URL *may* be immutable.

A server should serve immutable, versioned URLs
(`…/weather/1.4.2/module.js`) and use a `latest` pointer only when **adding** a
module, never when opening a document.

### 4. CORS, and the rest of the plumbing

`import(url)` from another origin needs the far end to allow it. A community
server serving its own modules is the easy case. Anything else — a raw GitHub
URL, somebody's blog — needs a proxy, and a proxy that fetches arbitrary URLs is
its own security question.

---

## What to do next, in order

1. **A framework-free authoring kit and a template repository.** If community
   modules must be framework-free, that path has to be the good one rather than
   the fallback.
2. **The server**: upload, immutable versioned URLs, a verified shelf, and a page
   per module generated from the same `name` / `description` the palette already
   reads.
3. **A trust boundary** worth the name, chosen from the table above — before the
   shelf has anything on it that was not written by its owner.

Step 1 is useful on its own even if the server never happens. That is the test of
whether it is the right first step.
