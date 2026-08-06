import { platformBrowser } from '@angular/platform-browser';

import { AppModule } from './app/app.module';

/*
 * Bootstrap does NOT wait for Google.
 *
 * It used to: `GoogleCharts.load()` fetched a script from gstatic.com and the
 * app started in its callback, so nothing at all rendered until a third party
 * answered. Two node types use charts, neither is in any flow this app opens
 * by itself, and both now load the library when they actually need it — so the
 * round-trip is off the critical path of every single page load, and the app
 * still starts with no network at all.
 *
 * `platformBrowserDynamic()` is gone — that package existed for the JIT
 * compiler. `platformBrowser().bootstrapModule()` is the AOT NgModule entry
 * point.
 *
 * `enableProdMode()` and the environment.ts / environment.prod.ts file
 * replacement are gone too: dev mode is decided by the build configuration now,
 * so that indirection had nothing left to switch.
 *
 * Also dropped from here: `hammerjs` (Material's HammerJS gesture integration no
 * longer exists) and `codemirror/mode/javascript/javascript` (CodeMirror 6 loads
 * languages as extensions rather than by side-effecting a global registry).
 *
 */
platformBrowser().bootstrapModule(AppModule)
  .catch(err => console.error(err));
