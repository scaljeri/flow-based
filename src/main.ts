import { platformBrowser } from '@angular/platform-browser';
import { GoogleCharts } from 'google-charts';

import { AppModule } from './app/app.module';

/*
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
 * GoogleCharts.load fetches Google's hosted script; the basic-graph and stats
 * node types construct chart objects, so bootstrap waits for it.
 */
GoogleCharts.load(() => {
  platformBrowser().bootstrapModule(AppModule)
    .catch(err => console.error(err));
});
