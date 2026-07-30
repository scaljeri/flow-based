## Flow based programming

Angular library for building flow-based programs / data flow diagrams, plus a demo app.
The current state can be seen [here](https://scaljeri.github.io/flow-based/).

Library to create Data flow diagrams with leveling. Depending on the visualisation, it can be just a DFD or documentation.
The whole flow is also represented as JSON, which can be exported.

![Example](images/fractal-demo.gif)

![FBP as doc](images/fbp-as-doc.jpg)

![Example](images/fbp.jpg)

![Example](images/gauss.jpg)

## Requirements

  * Node 22.22.3+, 24.15.0+ or 26+ (Angular 22's supported range)
  * npm (the workspace is npm-locked; there is no yarn.lock any more)

## Getting started

    $> npm install
    $> npm start          # builds the library, then serves the demo on :4200

The demo consumes the library through its published entry point
(`@scaljeri/flow-based`, mapped by `tsconfig.json` to `dist/flow-based`) rather
than by reaching into its source. That means the demo only compiles if the
package's public API is actually complete — which is the point.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Build the library, then serve the demo |
| `npm run build:lib` | Build the publishable library into `dist/flow-based` |
| `npm run build:demo` | Build the library, then the demo into `dist/demo` |
| `npm run watch:lib` | Rebuild the library on change |
| `npm test` | Unit tests (vitest, via `ng test`) for library and demo |
| `npm run test:lib` | Unit tests for the library only |
| `npm run lint` | ESLint over TypeScript and templates |
| `npm run e2e` | Playwright smoke tests (starts the dev server itself) |
| `npm run ngh` | Build and deploy the demo to gh-pages |

### Create a project specific component

    $>  ng g c foo --project=@scaljeri/flow-based

### Publish to npm

    $>  npm run build:lib
    $>  cd dist/flow-based && npm publish --access=public

## Architecture

  * `projects/flow-based` — the library. `utils/flow.ts` is the graph engine: a
    plain, framework-free class holding nodes, connections, sockets and workers.
  * `src` — the demo. Node types are registered in `src/app/fb-settings.ts` as
    `{component, settings, worker}`: the component draws the node, the
    `FbNodeWorker` computes it, and they are wired together by RxJS streams per
    socket.
  * Composite ("flow") nodes nest a whole flow inside a node, bridged by
    `FlowWorker` — this is the "leveling" the diagrams above show.

See [docs/AUDIT.md](docs/AUDIT.md) for an architecture assessment and the staged
roadmap, and [docs/MIGRATION-CHECKLIST.md](docs/MIGRATION-CHECKLIST.md) for the
Angular 7 → 22 migration record.

### TODO

  * Signals-based reactivity, replacing the manual `detectChanges()` scaffolding
  * Absolute graph coordinates + a viewport transform, unlocking zoom/pan
  * Support multiple visualisations
  * Extract a framework-agnostic core, then rewrite the shell in web components (Lit)
  * Build demo app in Angular, React and Vue
  * Make nodes external components, which can be npm dependencies
  * Undo/redo, save/load with a versioned schema, real web-worker execution

## Resources

   * https://www.youtube.com/watch?v=WjJdaDXN5Vs&index=4&list=LLRfaN_LmYUHepKKDWAjV9nw
   * https://app.flowhub.io/#project/138d806e-2b18-4cb5-961b-d7148258deeb/d13c397f-02e0-4d96-859c-abfe268d8bad
   * Nice article: https://colab.coop/blog/how-to-start-flowing-with-flow-based-programming/
   * Bezier demo: https://stackblitz.com/edit/angular-bezier-curves
   * Audio: http://webaudiodemos.appspot.com/
   * Gauss/charts: https://stackblitz.com/edit/google-charts?file=app%2Fgraph%2Fgraph.component.ts
   * Node red: https://flows.nodered.org/node/node-red-dashboard
   * Setup webworker: https://stackoverflow.com/questions/43276044/angular-cli-generated-app-with-web-workers/43276045#43276045
   * Julia Set demo: http://bl.ocks.org/syntagmatic/3736720, http://jsfiddle.net/b6Wb5/
   * Approximage Pi with mandelbrot: https://www.youtube.com/watch?v=d0vY0CKYhPY
   * Some similar: https://www.luna-lang.org/#Overview
   * Mandelbrot computation comparissons: https://github.com/ColinEberhardt/wasm-mandelbrot
   * Cardioide: https://nl.wikipedia.org/wiki/Cardio%C3%AFde


### Notes:
  * Mandelbrot: cusp, Seahorse tail

## POCs

  * https://stackblitz.com/edit/flow-based-programming
  * https://stackblitz.com/edit/angular-bezier-curves
