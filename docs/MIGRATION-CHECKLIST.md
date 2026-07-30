# Angular 7 → Angular 22.1 / Angular Material 22.1 Migration Checklist

**Scope:** the demo application in `src/`. The library in `projects/flow-based` uses no Angular Material
and is out of scope, except where it shares the toolchain (noted explicitly).

**Decision on record:** Material is **kept and migrated properly**. Target state is
Angular Material 22.1.x with the modern `mat.theme()` Sass API, the rewritten `<mat-slider>` markup,
and all internal-DOM SCSS selectors fixed. `google-charts` keeps working. The custom-code node
moves from CodeMirror 5 to **vanilla CodeMirror 6**.

---

## How the facts in this document were established

Nothing here is from memory. Specifically:

- **Package inspection.** Downloaded and read the actual published tarballs for
  `@angular/material@22.1.0`, `@angular/cdk@22.1.0`, `@angular/core@22.1.0`,
  `@angular/platform-browser@22.1.0`, `@angular/platform-browser-dynamic@22.1.0`,
  `@angular/animations@22.1.0`, `@angular/build@22.1.0`, `@angular-devkit/build-angular@22.1.0`,
  `@schematics/angular@22.1.0`, `codemirror@5.65.21`, `codemirror@6.0.2`, `@codemirror/view@6.43.7`,
  `@codemirror/state@6.7.1`, `@codemirror/lang-javascript@6.2.5`, `google-charts@2.0.0`,
  `@types/codemirror@5.60.17`. Read `package.json` exports maps, `types/*.d.ts` selector and
  input/output declarations, and compiled `fesm2022/*.mjs` templates + CSS.
- **Sass compiled for real.** Installed `sass@1.101.0` — the exact version `@angular/build@22.1.0`
  pins — and compiled every `.scss` file in this repo with the project's real `includePaths`.
- **TypeScript compiled for real.** Installed `typescript@6.0.3` and compiled candidate import forms
  and strict-mode probes.
- **A real `ng new`.** A v22 workspace was generated with `@angular/cli@22.1.1` on Node 26.4.0 to
  capture the authentic `angular.json` and `tsconfig.json`.
- **Official sources** at git tag `v22.1.0` of `angular/components` and `angular/angular`, plus
  `angular.dev` and `sass-lang.com`.

Confirmed target versions: `@angular/core@22.1.0`, `@angular/material@22.1.0`, `@angular/cdk@22.1.0`
(all `latest` on npm).

**Toolchain floors** (from `@angular/build@22.1.0`): TypeScript `>=6.0 <6.1`,
Node `^22.22.3 || ^24.15.0 || >=26.0.0`, esbuild 0.28.1, vite 8.1.5, **sass 1.101.0**.
From `@angular/core@22.1.0` peer deps: `rxjs ^6.5.3 || ^7.4.0`, `zone.js ~0.15.0 || ~0.16.0`
(optional peer).

---

## Table of contents

- [Part 0 — The six things that will silently break the app](#part-0)
- [Part 1 — Inventory](#part-1)
  - [1a. Material / CDK symbols imported](#1a)
  - [1b. Material components per template](#1b)
  - [1c. SCSS targeting Material internal DOM](#1c)
  - [1d. CDK Overlay / Portal usage](#1d)
  - [1e. SCSS `@import` resolution](#1e)
- [Part 2 — Material migration mapping](#part-2)
  - [2.1 Per-entry-point import paths](#21)
  - [2.2 `<mat-slider>` rewrite](#22)
  - [2.3 Theming: prebuilt themes and `mat.theme()`](#23)
  - [2.4 HammerJS](#24)
  - [2.5 Internal-DOM SCSS selectors: OLD → NEW](#25)
  - [2.6 Cards, form fields, lists, dialog, buttons](#26)
- [Part 3 — Non-Material blockers](#part-3)
  - [3.1 Polyfills](#31)
  - [3.2 `main.ts`](#32)
  - [3.3 Sass: `@import`, `includePaths`, division](#33)
  - [3.4 Removed Angular APIs](#34)
  - [3.5 Strict mode: the complete TS2564 list](#35)
- [Part 4 — CodeMirror 5 → CodeMirror 6](#part-4)
- [Part 5 — Exact `package.json`](#part-5)
- [Part 6 — Exact `angular.json`](#part-6)
- [Part 7 — Execution order](#part-7)
- [Part 8 — UNVERIFIED items](#part-8)

---

<a name="part-0"></a>
## Part 0 — The six things that will silently break the app

Read these first. Each affects many files, and five of the six fail **without any error message**.

### B1. `color="primary"` / `color="warn"` becomes a total no-op — 13 usages

Grepping the v22 M3 prebuilt themes: `.mat-primary` → **0 rules**, `.mat-accent` → **0 rules**,
`.mat-warn` → **0 rules**. The classes are still emitted (`MatToolbar`'s host binding is
`'[class]': 'color ? "mat-" + color : ""'`), but no M3 theme styles them. Every `.d.ts` says so:

> "Theme color of the toolbar. This API is supported in M2 themes only, it has no effect in M3 themes."

Because this migration adopts `mat.theme()` (which is M3), **all five toolbars and eight coloured
buttons render unthemed unless you act.** See [2.3](#23) for the two fixes.

`ThemePalette = 'primary' | 'accent' | 'warn' | undefined`, so `color="warn"` was always valid.
`color="secondary"` at `component-selection.component.html:1` was **already** invalid in Material 7
and remains a no-op. Note `MatButton` types `color` as `string | null` (not `ThemePalette`), so
`color="secondary"` is not even a type error — it silently emits a styleless `.mat-secondary`.

### B2. `placeholder` no longer floats — `<mat-label>` is now mandatory — 5 form fields

From compiled `fesm2022/_form-field-chunk.mjs`:

```js
_hasFloatingLabel = computed(() => !!this._labelChild());   // _labelChild = contentChild(MatLabel)
```

With no `<mat-label>`, **no label element is rendered at all**; `placeholder` degrades to a plain
native HTML placeholder that vanishes on focus. Material 7's default `legacy` appearance promoted
placeholders to floating labels. Five of this app's six form fields are placeholder-only.

### B3. `<mat-slider>` is a hard runtime crash — 4 sliders

`fesm2022/slider.mjs` contains a literal
`throw Error("Invalid slider thumb input configuration! ...")` from `_validateInputs()`. With
`ngDevMode` off it instead dies on `undefined.initProps()` — a `TypeError`. Either way
`ngAfterViewInit` fails. `MatSlider` is no longer a `ControlValueAccessor`; `MatSliderThumb` is.

This one is *loud*, which makes it self-locating. See [2.2](#22).

### B4. `<mat-list-item>` clips arbitrary content — `edit-node.component.html`

From compiled `list.mjs` CSS:

```css
.mdc-list-item { display:flex; overflow:hidden; align-items:stretch;
                 padding-left:16px; padding-right:16px; cursor:pointer; }
.mdc-list-item__content { text-overflow:ellipsis; white-space:nowrap; overflow:hidden; }
.mdc-list-item.mdc-list-item--with-one-line {
  height: var(--mat-list-list-item-one-line-container-height, 48px);   /* FIXED height */
}
```

`edit-node.component.html` puts a `<button mat-mini-fab>` (40px) plus **two** `<mat-form-field>`s
(~56px each) inside each `<mat-list-item>`. They get clipped to 48px and ellipsized. No error.

Worse, `list.mjs`'s `_updateItemLines()` actively *adds* MDC text classes to your projected content:

```js
unscopedContentEl.classList.toggle('mdc-list-item__primary-text', treatAsTitle);
unscopedContentEl.classList.toggle('mdc-list-item__secondary-text', !treatAsTitle);
```

and `.mdc-list-item__primary-text` carries `white-space: nowrap; overflow: hidden`.
`_checkDomForUnscopedTextContent()` returns true for *any* child with non-empty `textContent`, so a
form field with a label triggers it.

One fear that does **not** apply: `.mdc-list-item__content` has `pointer-events: none`, but
`.mat-mdc-list-base .mdc-list-item__content { pointer-events: auto }` restores it. Since
`<mat-list>` carries `mat-mdc-list-base`, buttons inside list items remain clickable.

### B5. Duplicate `#auto` template ref — `custom-code.component.html:10` and `:19`

Two `<mat-autocomplete #auto="matAutocomplete">` declarations in **the same template**. ViewEngine
(v7) tolerated this and resolved both `[matAutocomplete]="auto"` bindings to the first. Ivy's
template compiler rejects duplicate reference names in one scope. Rename to `#autoIn` / `#autoOut`.

### B6. `strict` is on by default in TypeScript 6 — 70 fields need `!`

The v22 `tsconfig.json` contains **no** `"strict": true` — because **TypeScript 6.0 makes `strict`
the default.** Verified against tsc 6.0.3 with a tsconfig containing no strict flag at all:

```
error TS7006: Parameter 'x' implicitly has an 'any' type.
error TS2564: Property 'p' has no initializer and is not definitely assigned in the constructor.
error TS7016: Could not find a declaration file for module 'fakelib'.
```

`strictTemplates` also defaults to `true` in v22. This is the **largest mechanical edit in the
migration** — 70 sites, enumerated in full at [3.5](#35). Nothing compiles until it is done.

---

<a name="part-1"></a>
## Part 1 — Inventory

<a name="1a"></a>
### 1a. Every `@angular/material` / `@angular/cdk` symbol imported

| # | File:line | Symbol | Current path | v22 path |
|---|---|---|---|---|
| 1 | `src/app/app.module.ts:15` | `MAT_DIALOG_DEFAULT_OPTIONS` | `@angular/material` ⛔ barrel | `@angular/material/dialog` |
| 2 | `src/app/app.module.ts:15` | `MatAutocompleteModule` | `@angular/material` ⛔ | `@angular/material/autocomplete` |
| 3 | `src/app/app.module.ts:16` | `MatButtonModule` | `@angular/material` ⛔ | `@angular/material/button` |
| 4 | `src/app/app.module.ts:16` | `MatCardModule` | `@angular/material` ⛔ | `@angular/material/card` |
| 5 | `src/app/app.module.ts:16` | `MatCheckboxModule` | `@angular/material` ⛔ | `@angular/material/checkbox` |
| 6 | `src/app/app.module.ts:16` | `MatDialogModule` | `@angular/material` ⛔ | `@angular/material/dialog` |
| 7 | `src/app/app.module.ts:17` | `MatInputModule` | `@angular/material` ⛔ | `@angular/material/input` |
| 8 | `src/app/app.module.ts:17` | `MatListModule` | `@angular/material` ⛔ | `@angular/material/list` |
| 9 | `src/app/app.module.ts:17` | `MatSelectModule` | `@angular/material` ⛔ | `@angular/material/select` |
| 10 | `src/app/app.module.ts:17` | `MatSliderModule` | `@angular/material` ⛔ | `@angular/material/slider` |
| 11 | `src/app/app.module.ts:17` | `MatToolbarModule` | `@angular/material` ⛔ | `@angular/material/toolbar` |
| 12 | `src/app/app.module.ts:19` | `MatIconModule` | `@angular/material/icon` | ✅ unchanged |
| 13 | `src/app/app.module.ts:20` | `MatTooltipModule` | `@angular/material/tooltip` | ✅ unchanged — **but unused, delete** |
| 14 | `src/app/app.module.ts:22` | `FullscreenOverlayContainer` | `@angular/cdk/overlay` | ✅ unchanged |
| 15 | `src/app/app.module.ts:22` | `OverlayContainer` | `@angular/cdk/overlay` | ✅ unchanged |
| 16 | `src/app/app.module.ts:22` | `OverlayModule` | `@angular/cdk/overlay` | ✅ unchanged |
| 17 | `src/app/app.component.ts:5` | `Overlay`, `OverlayRef` | `@angular/cdk/overlay` | ✅ unchanged, **not deprecated** |
| 18 | `src/app/app.component.ts:7` | `ComponentPortal` | `@angular/cdk/portal` | ✅ unchanged |
| 19 | `src/app/nodes/default-flow/default-flow.component.ts:4` | `MatDialog`, `MatDialogRef` | `@angular/material` ⛔ | `@angular/material/dialog` |
| 20 | `src/app/nodes/default-flow/add-socket/add-socket.component.ts:4` | `MAT_DIALOG_DATA`, `MatDialogRef` | `@angular/material` ⛔ | `@angular/material/dialog` |

**The deprecated barrel.** Used at `src/app/app.module.ts:14-18`,
`src/app/nodes/default-flow/default-flow.component.ts:4`, and
`src/app/nodes/default-flow/add-socket/add-socket.component.ts:4`.

The `"."` export key **still exists** in `@angular/material@22.1.0`'s `package.json`, but it points
at a stub. The entire contents of `types/material.d.ts` is three lines:

```ts
declare const ɵɵtsModuleIndicatorApiExtractorWorkaround = true;
export { ɵɵtsModuleIndicatorApiExtractorWorkaround };
```

Its real purpose is the `"sass": "./_index.scss"` condition, which is how `@use '@angular/material'`
resolves. The TypeScript barrel was deprecated in Material 8.0.0 and emptied in **9.0.0**. All three
files are hard compile errors.

**Also note: `MatCommonModule` was removed in Material 21.0.0** — not used here, but do not
reintroduce it from old documentation.

<a name="1b"></a>
### 1b. Every Material component used in every template

#### Toolbar — 5 files
| File:line | Usage |
|---|---|
| `src/app/app.component.html:1,9` | `<mat-toolbar [color]="'primary'">` |
| `src/app/nodes/default-flow/add-socket/add-socket.component.html:1,6` | `<mat-toolbar color="primary">` |
| `src/app/components/normal-node/normal-node.component.html:3,9` | `<mat-toolbar color="primary">` |
| `src/app/components/node-header/node-header.component.html:1,7` | `<mat-toolbar color="primary">` |
| `src/app/components/component-selection/component-selection.component.html:1,3` | `<mat-toolbar color="secondary">` ⛔ invalid palette |

#### Buttons — 14 instances
| File:line | Usage |
|---|---|
| `src/app/app.component.html:4` | `<button mat-button (click)="openModal()" class="add">` |
| `src/app/app.component.html:5` | `<button mat-button (click)="showJSON()">` |
| `src/app/nodes/fractal/fractal.component.html:12` | `<button mat-button (click)="onReset()">` |
| `src/app/nodes/stats/stats.component.html:41` | `<button mat-stroked-button (click)="onReset()">` |
| `src/app/nodes/default-flow/default-flow.component.html:5` | `<button mat-fab class="add-socket socket-in">` |
| `src/app/nodes/default-flow/default-flow.component.html:9` | `<button mat-fab class="add-socket socket-out">` |
| `src/app/nodes/default-flow/add-socket/add-socket.component.html:3` | `<button mat-button color="warn">` |
| `src/app/nodes/default-flow/add-socket/add-socket.component.html:14` | `<button mat-button color="warn">Cancel` |
| `src/app/nodes/default-flow/add-socket/add-socket.component.html:15,16` | `<button type="submit" mat-button>` ×2 |
| `src/app/components/normal-node/normal-node.component.html:6` | `<button mat-mini-fab color="primary">` |
| `src/app/components/normal-node/normal-node.component.html:20` | `<button mat-button color="warn">` |
| `src/app/components/normal-node/normal-node.component.html:24` | `<button mat-button class="close">Close` |
| `src/app/components/node-header/node-header.component.html:4` | `<button mat-mini-fab color="primary">` |
| `src/app/components/component-selection/component-selection.component.html:9` | `<button mat-button (click)="onSelection(key)">` |
| `src/app/components/edit-node/edit-node.component.html:12,17,35,40` | `<button mat-mini-fab color="warn"\|"primary">` ×4 |

#### Card — 5 files, 10 cards
| File:line | Usage |
|---|---|
| `src/app/nodes/merge-streams/merge-streams.component.html:7-9` | `mat-card` + `mat-card-content` |
| `src/app/nodes/merge-streams/merge-streams.component.html:14-16` | `mat-card` + `mat-card-content` |
| `src/app/nodes/random-numbers/random-numbers.component.html:8-9,46-47` | `mat-card.form` + `mat-card-content` |
| `src/app/nodes/random-numbers/random-numbers.component.html:49-54` | `mat-card.output` + **bare `mat-card-title`** (`:50`) + `mat-card-content` |
| `src/app/nodes/tap/tap.component.html:7-10` | `mat-card.current` + bare `mat-card-title` (`:8`) + `mat-card-content` |
| `src/app/nodes/tap/tap.component.html:11-14` | `mat-card.total` + bare `mat-card-title` (`:12`) + `mat-card-content` |
| `src/app/nodes/tap/tap.component.html:17-22` | `mat-card.history` + bare `mat-card-title` (`:18`) + `mat-card-content` |
| `src/app/nodes/stats/stats.component.html:27-42` | `mat-card.values` + **three sibling `mat-card-content`** (`:28,32,36`) + `mat-stroked-button` |
| `src/app/nodes/stats/stats.component.html:44-55` | `mat-card.distribution` + bare `mat-card-title` (`:45`) + `mat-card-content` |
| `src/app/components/edit-node/edit-node.component.html:1-7` | `mat-card.title` + `mat-card-content` |

#### Slider — 4 instances
| File:line | Usage |
|---|---|
| `src/app/nodes/random-numbers/random-numbers.component.html:14-16` | `<mat-slider [min] [max] step=".1" [thumbLabel]="true" formControlName="startValue" class="fb-drag-ignore">` |
| `src/app/nodes/random-numbers/random-numbers.component.html:24-26` | same, `formControlName="endValue"` |
| `src/app/nodes/random-numbers/random-numbers.component.html:34-36` | same, `step="100"`, `formControlName="intervalValue"` |
| `src/app/nodes/stats/stats.component.html:50-51` | `<mat-slider class="fb-drag-ignore" min="0" max="10" step=".1" [(ngModel)]="worker.columnWidth">` |

#### Checkbox — 1
`src/app/nodes/random-numbers/random-numbers.component.html:43` —
`<mat-checkbox formControlName="integersOnlyValue">`

#### Form field / matInput — 6 form fields
| File:line | Usage | Has `<mat-label>`? |
|---|---|---|
| `src/app/nodes/custom-code/custom-code.component.html:8-9` | `mat-form-field` + `<input matInput placeholder="Input format" [formControl] [matAutocomplete]>` | ❌ |
| `src/app/nodes/custom-code/custom-code.component.html:17-18` | same, "Output format" | ❌ |
| `src/app/nodes/default-flow/add-socket/add-socket.component.html:9-10` | `mat-form-field` + `<input matInput formControlName="name" placeholder="Socket name">` | ❌ |
| `src/app/components/edit-node/edit-node.component.html:3-5` | `<mat-form-field matLine>` + `<input matInput placeholder="Title" [(ngModel)]>` | ❌ |
| `src/app/components/edit-node/edit-node.component.html:22-24`, `:45-47` | `<mat-form-field matLine>` + `<input matInput placeholder="Socket name">` | ❌ |
| `src/app/components/edit-node/edit-node.component.html:25-29`, `:48-52` | `<mat-form-field matLine>` + `<mat-label>Colors</mat-label>` + `<input matInput type="color">` | ✅ |

#### Select / Option / Autocomplete
| File:line | Usage |
|---|---|
| `src/app/nodes/fractal/fractal.component.html:3-10` | `mat-form-field` > `<mat-select placeholder="Select a fractal" [(ngModel)] (selectionChange)>` > `mat-option *ngFor` (`:6-8`) |
| `src/app/nodes/custom-code/custom-code.component.html:10-14` | `<mat-autocomplete #auto="matAutocomplete">` > `mat-option *ngFor` (`:11-13`) |
| `src/app/nodes/custom-code/custom-code.component.html:19-23` | `<mat-autocomplete #auto="matAutocomplete">` ⛔ **duplicate `#auto`** (B5) |

#### List — 3 lists
| File:line | Usage |
|---|---|
| `src/app/components/edit-node/edit-node.component.html:10-31` | `<mat-list class="socket-in">` > `<mat-list-item *ngFor>` (`:11`) containing mini-fab + 2 form fields |
| `src/app/components/edit-node/edit-node.component.html:33-55` | `<mat-list class="socket-out">` > `<mat-list-item *ngFor>` (`:34`) + `<mat-divider>` (`:53`) |
| `src/app/components/component-selection/component-selection.component.html:7-11` | `<mat-list>` > `<mat-list-item *ngFor>` (`:8`) > `<button mat-button>` (`:9`) |

#### Icon — 8
`src/app/nodes/default-flow/default-flow.component.html:6,10` (`add`);
`src/app/nodes/default-flow/add-socket/add-socket.component.html:4` (`delete_forever`);
`src/app/components/normal-node/normal-node.component.html:7` (`edit`), `:21` (`delete_forever`);
`src/app/components/node-header/node-header.component.html:5` (`edit`);
`src/app/components/edit-node/edit-node.component.html:14,37` (`delete_forever`), `:19,42` (`arrow_right_alt`).

#### Divider — 1
`src/app/components/edit-node/edit-node.component.html:53` — `<mat-divider>`

#### Dialog
No `mat-dialog-title` / `mat-dialog-content` / `mat-dialog-actions` directives are used anywhere.
`AddSocketComponent` is opened via `MatDialog.open()`
(`src/app/nodes/default-flow/default-flow.component.ts:64`) and lays itself out with a raw
`<mat-toolbar>` + `<form>` + `<footer>`. Dialog styling is done purely through global element
selectors — see [1c](#1c) rows 1-2.

#### Tooltip
**Zero usages.** `MatTooltipModule` at `src/app/app.module.ts:20,77` is dead — a grep across all of
`src/` and `projects/` found no `matTooltip`.

<a name="1c"></a>
### 1c. Every SCSS rule targeting Material internal DOM

| # | File:line | Selector | Verdict in v22 |
|---|---|---|---|
| 1 | `src/styles/_index.scss:17` | `.cdk-overlay-container mat-dialog-container { overflow: visible }` | ✅ element still matches — but `overflow` moved to `.mat-mdc-dialog-content`; **silent no-op** |
| 2 | `src/styles/_index.scss:25` | `.add-socket-dialog mat-dialog-container { padding: 0 }` | ✅ matches — but the container now has **zero padding by default**; **silent no-op** (harmless) |
| 3 | `src/app/app.component.scss:12` | `mat-toolbar { display:flex; height:64px; ... }` | ✅ **fully works** — toolbar was never MDC-rewritten |
| 4 | `src/app/nodes/merge-streams/merge-streams.component.scss:24` | `mat-toolbar { ... }` | ✅ works — but **dead code**, no `mat-toolbar` in that template |
| 5 | `src/app/nodes/merge-streams/merge-streams.component.scss:49` | `mat-card { display:flex; align-items:center; justify-content:center }` | ⚠️ `.mat-mdc-card` is now `display:flex; flex-direction:column` — your cross-axis rules now act on a column |
| 6 | `src/app/nodes/merge-streams/merge-streams.component.scss:72` | `.output mat-card-content { font-size:30px }` | ⚠️ padding model changed |
| 7 | `src/app/nodes/random-numbers/random-numbers.component.scss:31` | `.card-wrapper mat-card { flex:1 }` | ⚠️ card lost its `padding:16px` |
| 8 | `src/app/nodes/random-numbers/random-numbers.component.scss:35` | `mat-card ~ mat-card { margin-left:8px }` | ✅ works |
| 9 | `src/app/nodes/random-numbers/random-numbers.component.scss:67` | `label mat-checkbox { margin-left:16px }` | ✅ works (host element unchanged) |
| 10 | `src/app/nodes/random-numbers/random-numbers.component.scss:78` | `.output mat-card-content { display:flex; flex:1; font-size:40px }` | ⚠️ padding model changed |
| 11 | `src/app/nodes/stats/stats.component.scss:58` | `.values mat-card-content { display:flex; flex-direction:column }` | ⚠️ three siblings now each pick up `:first-child`/`:last-child` padding rules |
| 12 | `src/app/nodes/stats/stats.component.scss:79` | `.column-width mat-slider { margin:0 8px }` | ⚠️ element matches, but the slider is being rebuilt — re-verify after [2.2](#22) |
| 13 | `src/app/nodes/tap/tap.component.scss:70` | `.current mat-card-content { color:#000; display:flex; font-size:50px }` | ⚠️ padding model changed |
| 14 | `src/app/nodes/tap/tap.component.scss:79` | `.total mat-card-content { font-size:40px }` | ⚠️ same |
| 15 | `src/app/nodes/tap/tap.component.scss:87` | `.history mat-card-content { display:flex; flex-wrap:wrap; height:90% }` | ⚠️ same |
| 16 | `src/app/nodes/default-flow/add-socket/add-socket.component.scss:8` | `mat-toolbar { display:flex; justify-content:space-between }` | ✅ works |
| 17 | `src/app/components/normal-node/normal-node.component.scss:43` | `header mat-toolbar { display:flex; width:100% }` | ✅ works |
| 18 | `src/app/components/edit-node/edit-node.component.scss:22` | `mat-list { display:flex; flex-direction:column; padding:20px; width:50% }` | ⚠️ matches, but `.mdc-list` now has its own `padding:8px 0` |
| 19 | `src/app/components/edit-node/edit-node.component.scss:30` | `mat-list-item { margin:32px 0; position:relative }` | 🔴 matches, **but content inside is clipped** — see B4 |
| 20 | `src/app/components/edit-node/edit-node.component.scss:34` | `mat-list-item mat-label { color:#0009; font-size:16px; transform:scale(0.75) }` | 🔴 `<mat-label>` is now wrapped in `.mdc-floating-label` and Material animates its own transform — your `scale(0.75)` **fights** it |
| 21 | `src/app/components/component-selection/component-selection.component.scss:8` | `mat-toolbar { display:flex; justify-content:center }` | ✅ works |

**A significant piece of good news for this repo:** every one of these 21 selectors is an **element**
selector, not a `.mat-*` class selector. Every element name used here — `mat-card`,
`mat-card-content`, `mat-card-title`, `mat-toolbar`, `mat-checkbox`, `mat-list`, `mat-list-item`,
`mat-slider`, `mat-divider`, `mat-dialog-container`, `mat-label` — is **unchanged** in v22. I
verified each against the `ɵcmp` / `ɵdir` selector strings in the shipped typings. So **no selector
stops matching**; what breaks is the layout, padding, and structure underneath. This is far better
than the typical MDC migration where `.mat-card` → `.mat-mdc-card` breaks everything at once.

The one class-based CDK selector, `.cdk-overlay-container` (`src/styles/_index.scss:17`), still
exists — confirmed in `cdk/overlay-prebuilt.css` and in `_overlay-module-chunk.mjs`
(`container.classList.add('cdk-overlay-container')`).

Not Material internal DOM, listed for completeness: `.dark-backdrop` (`src/styles/_index.scss:21`)
is a custom `backdropClass` set at `src/app/app.component.ts:61` — unaffected.

<a name="1d"></a>
### 1d. Every CDK Overlay / Portal API usage

All in `src/app/app.component.ts`:

| Line | API | v22 status |
|---|---|---|
| 5 | `import { Overlay, OverlayRef } from '@angular/cdk/overlay'` | ✅ unchanged |
| 7 | `import { ComponentPortal } from '@angular/cdk/portal'` | ✅ unchanged |
| 26 | `activeOverlay: OverlayRef \| null` | ✅ (needs `!` — see [3.5](#35)) |
| 34 | `constructor(..., private overlay: Overlay)` | ✅ **`Overlay` is NOT deprecated in CDK 22** |
| 39, 71, 89 | `this.activeOverlay!.dispose()` | ✅ |
| 53 | `new ComponentPortal(ComponentSelectionComponent)` | ✅ |
| 54-57 | `this.overlay.position().global().centerHorizontally().centerVertically()` | ✅ all three methods present |
| 59-66 | `this.overlay.create({hasBackdrop, backdropClass, panelClass, height, width, positionStrategy})` | ✅ |
| 68 | `this.activeOverlay.attach(portal)` | ✅ |
| 70 | `this.activeOverlay.backdropClick().subscribe(...)` | ✅ |

Plus `src/app/app.module.ts:22,78,86`: `OverlayModule` in `imports`, and
`{provide: OverlayContainer, useClass: FullscreenOverlayContainer}` — both still exported from
`@angular/cdk/overlay`.

I checked the deprecation question specifically across four CDK majors by reading the typings:
`class Overlay` carries **no** `@deprecated` tag in 19.2.19, 20.2.14, 21.2.14, or 22.1.0. A
functional alternative (`createOverlayRef`, `createGlobalPositionStrategy`, …) was *added* in CDK 20
for tree-shaking, but the service was never deprecated.

**This entire file needs no Overlay-related changes.** Optional modernization only:

```ts
// OLD (still fully supported)
constructor(private overlay: Overlay) {}
const ref = this.overlay.create({ ...config, positionStrategy: this.overlay.position().global() });

// NEW (optional, better tree-shaking)
private injector = inject(Injector);
const ref = createOverlayRef(this.injector, {
  ...config,
  positionStrategy: createGlobalPositionStrategy(this.injector).centerHorizontally().centerVertically(),
});
```

Two minor deprecations found on `OverlayRef` (not used here): `updateSize({width})` and
`({height})` — "Pass the width/height through the OverlayConfig".

**One behavioural change to watch:** CDK 22 wraps overlay `z-index` in a CSS cascade layer —
`@layer cdk-overlay { .cdk-overlay-container { z-index: 1000 } }`. Unlayered CSS beats layered CSS
regardless of specificity, so your own `z-index` rules now win more easily than before.

<a name="1e"></a>
### 1e. Every SCSS `@import` and how it resolves

`angular.json` sets `stylePreprocessorOptions.includePaths: ["src/styles", "projects/flow-based/src/lib/"]`.

| File:line | Import | Resolves to | Via |
|---|---|---|---|
| `src/styles.scss:57` | `'styles/index'` | `src/styles/_index.scss` | relative to importer |
| `src/styles/_index.scss:1` | `'utils/trigonometry'` | `src/styles/utils/_trigonometry.scss` | relative |
| `src/styles/_utils.scss:1` | `'utils/trigonometry'` | `src/styles/utils/_trigonometry.scss` | relative |
| `src/app/context-menu/context-menu.component.scss:1` | `'utils'` | `src/styles/_utils.scss` | **includePath #1** |
| `src/app/app.component.scss:1` | `'utils/utils'` | `projects/flow-based/src/lib/utils/_utils.scss` | **includePath #2** |
| `src/app/nodes/custom-code/custom-code.component.scss:1` | `'utils/utils'` | same | includePath #2 |
| `src/app/nodes/random-numbers/random-numbers.component.scss:1` | `'utils/utils'` | same | includePath #2 |
| `src/app/components/default-front/default-front.component.scss:1` | `'utils/utils'` | same | includePath #2 |
| `src/app/nodes/basic-graph/basic-graph.component.scss:1` | `'./utils/utils'` | same | **includePath #2 despite the `./` prefix** — empirically confirmed |
| `src/app/nodes/tap/tap.component.scss:1` | `'../../../../projects/flow-based/src/lib/utils/utils'` | same | relative |
| `src/app/nodes/merge-streams/merge-streams.component.scss:1` | same relative | same | relative |
| `src/app/nodes/default-flow/default-flow.component.scss:1` | same relative | same | relative |
| `src/app/nodes/stats/stats.component.scss:1` | same relative | same | relative |
| `src/app/components/normal-node/normal-node.component.scss:1` | same relative | same | relative |
| `src/app/nodes/canvas/canvas.component.scss:1` | `'.../utils/_utils.scss'` (explicit partial + ext) | same | relative |
| `src/app/nodes/zoom-canvas/zoom-canvas.component.scss:1` | same explicit form | same | relative |
| `src/app/components/edit-node/edit-node.component.scss:1,2` | `.../utils/utils`, `.../utils/variables` | `_utils.scss`, `_variables.scss` | relative |
| `src/app/nodes/default-flow/add-socket/add-socket.component.scss:1,2` | same two, one level deeper | same | relative |

**Empirical result: all 23 `.scss` files in `src/` compile with exit code 0 under sass 1.101.0 with
these exact load paths.** Details and warnings at [3.3](#33).

---

<a name="part-2"></a>
## Part 2 — Material migration mapping

<a name="21"></a>
### 2.1 Per-entry-point import paths

`src/app/app.module.ts:14-18` — OLD → NEW:

```diff
- import {
-   MAT_DIALOG_DEFAULT_OPTIONS, MatAutocompleteModule,
-   MatButtonModule, MatCardModule, MatCheckboxModule, MatDialogModule,
-   MatInputModule, MatListModule, MatSelectModule, MatSliderModule, MatToolbarModule
- } from '@angular/material';
+ import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogModule } from '@angular/material/dialog';
+ import { MatAutocompleteModule } from '@angular/material/autocomplete';
+ import { MatButtonModule }       from '@angular/material/button';
+ import { MatCardModule }         from '@angular/material/card';
+ import { MatCheckboxModule }     from '@angular/material/checkbox';
+ import { MatInputModule }        from '@angular/material/input';
+ import { MatListModule }         from '@angular/material/list';
+ import { MatSelectModule }       from '@angular/material/select';
+ import { MatSliderModule }       from '@angular/material/slider';
+ import { MatToolbarModule }      from '@angular/material/toolbar';
```

`src/app/nodes/default-flow/default-flow.component.ts:4`:

```diff
- import { MatDialog, MatDialogRef } from '@angular/material';
+ import { MatDialog, MatDialogRef } from '@angular/material/dialog';
```

`src/app/nodes/default-flow/add-socket/add-socket.component.ts:4`:

```diff
- import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
+ import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
```

Also delete the two dead module imports at `src/app/app.module.ts:20,77` (`MatTooltipModule`) and
`:13,79` (`CodemirrorModule` — see [Part 4](#part-4)).

#### Reference: canonical entry point for every symbol this app could need

| Symbol(s) | Entry point |
|---|---|
| `MatButtonModule`, `MatButton`, `MatFabButton`, `MatMiniFabButton`, `MatIconButton`, `MatAnchor`, `MAT_BUTTON_CONFIG`, `MAT_FAB_DEFAULT_OPTIONS` | `@angular/material/button` |
| `MatCardModule`, `MatCard`, `MatCardHeader`, `MatCardTitle`, `MatCardSubtitle`, `MatCardContent`, `MatCardActions`, `MatCardFooter`, `MatCardTitleGroup` | `@angular/material/card` |
| `MatCheckboxModule`, `MatCheckbox`, `MatCheckboxChange`, `MAT_CHECKBOX_DEFAULT_OPTIONS` | `@angular/material/checkbox` |
| `MatDialogModule`, `MatDialog`, `MatDialogRef`, `MatDialogContainer`, `MAT_DIALOG_DATA`, `MAT_DIALOG_DEFAULT_OPTIONS`, `MAT_DIALOG_SCROLL_STRATEGY`, `MatDialogConfig`, `MatDialogTitle`, `MatDialogContent`, `MatDialogActions`, `MatDialogClose` | `@angular/material/dialog` |
| `MatInputModule`, `MatInput`, `MAT_INPUT_CONFIG` | `@angular/material/input` |
| `MatListModule`, `MatList`, `MatListItem`, `MatNavList`, `MatActionList`, `MatListItemTitle`, `MatListItemLine`, `MatListItemMeta`, `MatListItemAvatar`, `MatListItemIcon` | `@angular/material/list` |
| `MatSelectModule`, `MatSelect`, `MatSelectChange`, `MatSelectTrigger`, `MAT_SELECT_CONFIG` | `@angular/material/select` |
| `MatSliderModule`, `MatSlider`, `MatSliderThumb`, `MatSliderRangeThumb`, `MatSliderDragEvent` | `@angular/material/slider` |
| `MatToolbarModule`, `MatToolbar`, `MatToolbarRow` | `@angular/material/toolbar` |
| `MatAutocompleteModule`, `MatAutocomplete`, `MatAutocompleteTrigger`, `MatAutocompleteSelectedEvent` | `@angular/material/autocomplete` |
| `MatIconModule`, `MatIcon`, `MatIconRegistry`, `MAT_ICON_DEFAULT_OPTIONS` | `@angular/material/icon` |
| `MatTooltipModule`, `MatTooltip`, `MAT_TOOLTIP_DEFAULT_OPTIONS` | `@angular/material/tooltip` |
| `MatFormFieldModule`, `MatFormField`, `MatLabel`, `MatHint`, `MatError`, `MatPrefix`, `MatSuffix`, `MAT_FORM_FIELD_DEFAULT_OPTIONS`, `MatFormFieldAppearance` | `@angular/material/form-field` |
| `MatOption`, `MatOptionModule`, `MatOptgroup` | `@angular/material/core` (canonical); also re-exported from `/select` and `/autocomplete` |
| `MatDivider`, `MatDividerModule` | `@angular/material/divider` |
| `ThemePalette`, `MatRipple`, `MatLine`, `MATERIAL_ANIMATIONS`, `VERSION` | `@angular/material/core` |

#### Optional: go standalone

**All Material components are standalone since 17.1.0.** I parsed every declaration in 22.1.0:
**91 with `standalone: true`, 0 with `false`.** The NgModules still exist but are unnecessary:

```ts
imports: [
  MatToolbar, MatButton, MatFabButton, MatMiniFabButton,
  MatCard, MatCardContent, MatCardTitle,
  MatSlider, MatSliderThumb, MatCheckbox,
  MatFormField, MatLabel, MatInput,
  MatSelect, MatOption, MatAutocomplete, MatAutocompleteTrigger,
  MatList, MatListItem, MatIcon, MatDivider,
]
```

<a name="22"></a>
### 2.2 `<mat-slider>` rewrite

Verified from `types/slider.d.ts`. `MatSlider` selector `mat-slider`; complete input list:
**`disabled, discrete, showTickMarks, min, color, disableRipple, max, step, displayWith`**. No
`value`, no `thumbLabel`, no `tickInterval`, no `ControlValueAccessor`. `MatSliderThumb` selector
`input[matSliderThumb]`, single input `value`, outputs `valueChange, dragStart, dragEnd`, and it
implements `ControlValueAccessor`.

**`min` / `max` / `step` stay on `<mat-slider>`.** Proof beyond the input lists: `slider.mjs`'s
`initProps()` does `this.step = this._slider.step; this.min = this._slider.min;` — it actively
overwrites anything set on the `<input>`.

#### `src/app/nodes/random-numbers/random-numbers.component.html:14-16` — reactive forms

```diff
- <mat-slider [min]="worker.min" [max]="worker.max" step=".1"
-             [thumbLabel]="true"
-             formControlName="startValue" class="fb-drag-ignore"></mat-slider>
+ <mat-slider [min]="worker.min" [max]="worker.max" step=".1" discrete class="fb-drag-ignore">
+   <input matSliderThumb formControlName="startValue">
+ </mat-slider>
```

Identical treatment for `:24-26` (`formControlName="endValue"`) and `:34-36`
(`formControlName="intervalValue"`, `step="100"`).

#### `src/app/nodes/stats/stats.component.html:50-51` — `ngModel`

```diff
- <mat-slider class="fb-drag-ignore" min="0" max="10" step=".1"
-             [(ngModel)]="worker.columnWidth"></mat-slider>
+ <mat-slider class="fb-drag-ignore" min="0" max="10" step=".1">
+   <input matSliderThumb [(ngModel)]="worker.columnWidth">
+ </mat-slider>
```

#### Complete API relocation table

| OLD (v7, on `<mat-slider>`) | NEW |
|---|---|
| `min` / `max` / `step` | `<mat-slider>` — **unchanged location** |
| `[thumbLabel]="true"` | `discrete` on `<mat-slider>` |
| `tickInterval="1"` | `showTickMarks` on `<mat-slider>` (interval is always `step` now, not configurable) |
| `displayWith` | `<mat-slider>` — unchanged |
| `color` / `disabled` / `disableRipple` | `<mat-slider>` — unchanged (but `color` is inert under M3, see B1) |
| `[value]` | `[value]` on `<input matSliderThumb>` |
| `(valueChange)` | `(valueChange)` on the `<input>` |
| `(change)` / `(input)` (emitting `MatSliderChange`) | native DOM `(change)` / `(input)` on the `<input>` |
| `formControlName` / `[(ngModel)]` / `[formControl]` | on the `<input matSliderThumb>` |
| — | new: `(dragStart)` / `(dragEnd)` on the `<input>` |
| `invert`, `vertical` | 🔴 **removed, no replacement exists** |
| `displayValue`, `valueText` | 🔴 removed — use `displayWith` / native `aria-valuetext` |

For a range slider (not used here): two inputs with `matSliderStartThumb` and `matSliderEndThumb`.

`MatSliderChange` still ships but is annotated
`@deprecated Use event bindings directly on the MatSliderThumbs` / `@breaking-change 17.0.0`.

Because `strictTemplates` defaults to `true` in v22, leftover `[value]` / `(valueChange)` /
`(change)` bindings on `<mat-slider>` become **NG8002 compile errors** — helpful. Bare attributes
like `thumbLabel` degrade to inert HTML attributes silently, so grep for them explicitly.

#### DOM: OLD vs NEW

```html
<!-- Material 7 -->
<mat-slider class="mat-slider mat-primary mat-slider-horizontal">
  <div class="mat-slider-wrapper">
    <div class="mat-slider-track-wrapper">
      <div class="mat-slider-track-background"></div>
      <div class="mat-slider-track-fill"></div>
    </div>
    <div class="mat-slider-ticks-container"><div class="mat-slider-ticks"></div></div>
    <div class="mat-slider-thumb-container">
      <div class="mat-slider-focus-ring"></div>
      <div class="mat-slider-thumb"></div>
      <div class="mat-slider-thumb-label"><span class="mat-slider-thumb-label-text">…</span></div>
    </div>
  </div>
</mat-slider>

<!-- Material 22 -->
<mat-slider class="mat-mdc-slider mdc-slider mat-primary">
  <input matSliderThumb class="mdc-slider__input" type="range">
  <div class="mdc-slider__track">
    <div class="mdc-slider__track--inactive"></div>
    <div class="mdc-slider__track--active">
      <div class="mdc-slider__track--active_fill"></div>
    </div>
    <!-- only when showTickMarks -->
    <div class="mdc-slider__tick-marks">
      <div class="mdc-slider__tick-mark--active"></div>
      <div class="mdc-slider__tick-mark--inactive"></div>
    </div>
  </div>
  <mat-slider-visual-thumb class="mdc-slider__thumb mat-mdc-slider-visual-thumb">
    <!-- only when discrete -->
    <div class="mdc-slider__value-indicator-container">
      <div class="mdc-slider__value-indicator">
        <span class="mdc-slider__value-indicator-text">…</span>
      </div>
    </div>
    <div class="mdc-slider__thumb-knob"></div>
    <div class="mat-focus-indicator"></div>
  </mat-slider-visual-thumb>
</mat-slider>
```

Every v7 slider internal class is gone —
`grep -c "mat-slider-thumb\|mat-slider-track-fill\|mat-slider-wrapper" slider.mjs` returns **0**.

| OLD class | NEW |
|---|---|
| `.mat-slider` | `.mat-mdc-slider` (+ `.mdc-slider`) |
| `.mat-slider-wrapper`, `.mat-slider-track-wrapper` | *(none — elements deleted)* |
| `.mat-slider-track-fill` | `.mdc-slider__track--active_fill` |
| `.mat-slider-track-background` | `.mdc-slider__track--inactive` |
| `.mat-slider-thumb` | `.mdc-slider__thumb-knob` |
| `.mat-slider-thumb-container` | `.mat-mdc-slider-visual-thumb` / `.mdc-slider__thumb` |
| `.mat-slider-thumb-label` | `.mdc-slider__value-indicator` |
| `.mat-slider-thumb-label-text` | `.mdc-slider__value-indicator-text` |
| `.mat-slider-ticks` | `.mdc-slider__tick-mark--active` / `--inactive` |
| `.mat-slider-focus-ring` | `.mat-focus-indicator` |
| `.mat-slider-disabled` | `.mdc-slider--disabled` |
| `.mat-slider-horizontal`, `-vertical`, `-axis-inverted` | *(none — vertical/inverted deleted)* |

Note the internals use the `mdc-` prefix, **not** `mat-mdc-`. A blanket find-replace produces wrong
selectors. This repo has no such selectors, so no action needed — but `src/app/nodes/stats/stats.component.scss:79`
(`mat-slider { margin: 0 8px }`) should be re-checked visually.

**`.fb-drag-ignore` keeps working.** `projects/flow-based/src/lib/drag-drop/draggable/draggable.directive.ts:21`
uses `event.target.closest('.fb-drag-ignore')`, which walks *up* from the inner `<input>` to the
`<mat-slider>` host carrying the class. No change needed. Do note that
`MatSliderThumb._updateWidthInactive()` deliberately stretches the input wider than the track, so
hit areas differ slightly from v7.

<a name="23"></a>
### 2.3 Theming: prebuilt themes and `mat.theme()`

#### Does `node_modules/@angular/material/prebuilt-themes/indigo-pink.css` still exist?

**Yes.** I listed the 22.1.0 tarball directly:

```
prebuilt-themes/azure-blue.css          7,394 B   M3, light
prebuilt-themes/rose-red.css            7,394 B   M3, light
prebuilt-themes/cyan-orange.css         7,394 B   M3, dark
prebuilt-themes/magenta-violet.css      7,394 B   M3, dark
prebuilt-themes/deeppurple-amber.css  111,293 B   M2, light
prebuilt-themes/indigo-pink.css       110,760 B   M2, light
prebuilt-themes/pink-bluegrey.css     107,854 B   M2, dark
prebuilt-themes/purple-green.css      107,855 B   M2, dark
```

All eight are explicit keys in the `exports` map. The M2/M3 split is visible in the files:
`indigo-pink.css` opens with `html { --mat-sys-on-surface: initial; }` — explicitly opting *out* of
M3 system variables — followed by full per-component CSS, hence 110 KB. `azure-blue.css` is 7 KB of
nothing but `--mat-sys-*` variables.

`guides/theming.md` at tag `v22.1.0`: *"The M2 themes are provided for backwards compatibility and
**will be removed in a future version**."* No version is named.

Since this migration adopts the Sass API, **the prebuilt theme entry is deleted from `angular.json`
entirely** and replaced by `src/styles.scss` doing the theming. See [Part 6](#part-6).

#### The `mat.theme()` setup — verified compiling against Material 22.1.0

I compiled this exact block against the real package; it produced 167 lines of `--mat-sys-*` output.

`src/styles.scss` — NEW, replacing the `indigo-pink.css` entry in `angular.json`:

```scss
@use '@angular/material' as mat;

html {
  color-scheme: light;              // or `light dark` to follow the OS
  @include mat.theme((
    color: (
      primary: mat.$azure-palette,
      tertiary: mat.$blue-palette,
      theme-type: light,            // color-scheme (default) | light | dark
    ),
    typography: (
      plain-family: ('Source Code Pro', monospace),
      brand-family: ('Source Code Pro', monospace),
    ),
    density: 0,                     // 0 to -5
  ));
}

body {
  background-color: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
  font: var(--mat-sys-body-medium);
}

// ... the existing CSS reset and @import 'styles/index' follow
```

The `typography` map keeps this app's existing `'Source Code Pro', monospace` family from
`src/styles/_index.scss:6`. A bare `typography: Roboto` also works.

`$config` keys are exactly `color`, `typography`, `density`. `mat.theme` emits nothing for a category
you omit. Twelve palettes are available: `mat.$red-palette`, `$green-`, `$blue-`, `$yellow-`,
`$cyan-`, `$magenta-`, `$orange-`, `$chartreuse-`, `$spring-green-`, `$azure-`, `$violet-`,
`$rose-palette`. Custom palettes: `ng generate @angular/material:theme-color`.

Light/dark is driven by the CSS `color-scheme` property — `mat.theme` wraps colours in `light-dark()`
when `theme-type` is `color-scheme` (the default). Set `color-scheme: light dark` on `html` to follow
the OS, or toggle a class that sets `color-scheme: dark`.

#### 🔴 Fixing B1: getting `color="primary"` / `color="warn"` back

`mat.theme()` is M3, and M3 emits no `.mat-primary` / `.mat-warn` rules. Two options:

**Option A — the backwards-compatibility mixin (recommended as a bridge).** Verified present at
`package/core/theming/_color-api-backwards-compatibility.scss`, forwarded from `_index.scss:13`:

```scss
html {
  @include mat.theme(( /* as above */ ));
  @include mat.color-variants-backwards-compatibility($theme);
}
```

> **UNVERIFIED:** I confirmed this mixin exists and is exported, and that `mat.theme()` compiles. I
> did **not** empirically confirm that it fully restores this app's specific toolbar and button
> colours, nor the exact `$theme` argument it expects alongside the inline-map form of `mat.theme()`.
> Verify visually against all 5 toolbars and 8 coloured buttons before considering B1 closed.

**Option B — drop `color` and restyle with tokens (the M3-native answer).** Delete every `color=`
attribute and express intent through tokens instead:

```scss
// toolbar
html { @include mat.toolbar-overrides((
  container-background-color: var(--mat-sys-primary),
  container-text-color: var(--mat-sys-on-primary),
)); }
```

and for buttons use the appearance API rather than a palette:
`matButton="filled"` / `"elevated"` / `"outlined"` / `"tonal"`.

Either way, fix `component-selection.component.html:1` — `color="secondary"` is not a valid palette
in any Material version:

```diff
- <mat-toolbar color="secondary">
+ <mat-toolbar color="primary">
```

#### Sass API status in 22.1 — all verified by compiling

| API | Status |
|---|---|
| `mat.theme()` | ✅ exists |
| `mat.theme-overrides()` | ✅ exists |
| `mat.<component>-overrides()` (e.g. `mat.card-overrides`, `mat.dialog-overrides`) | ✅ exists for ~40 components |
| `mat.system-classes()` | ✅ exists (`.mat-bg-*`, `.mat-text-*`, `.mat-font-*`, `.mat-border`, `.mat-border-subtle`, `.mat-corner-*`) |
| `mat.color-variants-backwards-compatibility()` | ✅ exists — the B1 bridge |
| `mat.elevation()`, `mat.elevation-classes()`, `mat.app-background()` | ✅ all exist |
| `mat.typography-hierarchy()` | ✅ exists |
| `mat.all-component-themes()` | ✅ exists, not deprecated (M2 workflow) |
| `mat.core()` | ⚠️ exists but is a **deprecated empty no-op** — literally `@mixin core() {}`. Do not call it. |
| **`mat.define-light-theme()`** | 🔴 **GONE — renamed in Material 18.0.0.** `_index.scss:2` is `@forward './core/m2' as m2-*;` |
| `mat.m2-define-light-theme()`, `mat.m2-define-palette()`, `mat.$m2-indigo-palette` | ✅ exist (I compiled a full M2 theme successfully) |
| `mat.define-theme()` | ✅ exists, not deprecated, but superseded by `mat.theme()` |

`mat.$theme-ignore-duplication-warnings` is available if calling theme mixins in multiple scopes.

#### Material Icons

`src/index.html:9` — `<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">`
is **still the scaffolded default** in v22. `ng add @angular/material` writes exactly this URL
(verified in `schematics/ng-add/fonts/material-fonts.ts`), plus two `preconnect` hints. Material
Symbols is a documented opt-in via `fontSet` / `MatIconRegistry.setDefaultFontSetClass()`, not the
recommendation. **No change required.** Keep the `Source Code Pro` link at `:10` as-is.

<a name="24"></a>
### 2.4 HammerJS — not needed, and the integration no longer exists

`src/main.ts:7` — `import 'hammerjs';` → **DELETE**. Remove `hammerjs` from `package.json`.

Three independent confirmations:

1. `@angular/material@22.1.0` tarball: **0 occurrences of `hammer`** (case-insensitive) anywhere.
   Its only dependency is `tslib`.
2. `@angular/platform-browser@22.1.0`: **0 occurrences of `hammer`**, versus 42 in 21.2.19.
   `HammerModule`, `HammerGestureConfig`, `HAMMER_GESTURE_CONFIG` and `HAMMER_LOADER` were
   **removed in Angular 22.0.0** ("Hammer.js integration has been removed. Use your own
   implementation."), having been deprecated in 20.0.0.
3. Material stopped needing it in **v9**; `MAT_HAMMER_OPTIONS`, `GestureConfig` etc. were hard-removed
   in Material 10.0.0.

Consequence: any code still providing `HAMMER_GESTURE_CONFIG` is now a **compile error**, not dead
code. This repo does not, so deletion is clean. `MatSlider` drag works on native pointer events.

<a name="25"></a>
### 2.5 Internal-DOM SCSS selectors: OLD → NEW

#### Host element / class reference

| Element | v7 host class | v22 host class | Element selector still valid? |
|---|---|---|---|
| `mat-toolbar` | `.mat-toolbar` | **`.mat-toolbar`** (never MDC-rewritten) | ✅ |
| `mat-toolbar-row` | `.mat-toolbar-row` | **`.mat-toolbar-row`** | ✅ |
| `mat-divider` | `.mat-divider` | **`.mat-divider`** (never rewritten) | ✅ |
| `mat-card` | `.mat-card` | `.mat-mdc-card` | ✅ |
| `mat-card-content` | `.mat-card-content` | `.mat-mdc-card-content` | ✅ |
| `mat-card-title` | `.mat-card-title` | `.mat-mdc-card-title` | ✅ |
| `mat-checkbox` | `.mat-checkbox` | `.mat-mdc-checkbox` | ✅ |
| `mat-list` | `.mat-list` | `.mat-mdc-list` + `.mdc-list` | ✅ |
| `mat-list-item` | `.mat-list-item` | `.mat-mdc-list-item` + `.mdc-list-item` | ✅ |
| `mat-slider` | `.mat-slider` | `.mat-mdc-slider` + `.mdc-slider` | ✅ |
| `mat-select` | `.mat-select` | `.mat-mdc-select` | ✅ |
| `mat-option` | `.mat-option` | `.mat-mdc-option` + **`.mdc-list-item`** | ✅ |
| `mat-autocomplete` | `.mat-autocomplete` | `.mat-mdc-autocomplete` | ✅ |
| `mat-form-field` | `.mat-form-field` | `.mat-mdc-form-field` | ✅ |
| `mat-dialog-container` | `.mat-dialog-container` | `.mat-mdc-dialog-container` + `.mdc-dialog` | ✅ |
| `mat-label` | `.mat-form-field-label` | `.mdc-floating-label` / `.mat-mdc-floating-label` | ✅ |

**Do NOT blanket find-replace `mat-` → `mat-mdc-`.** Toolbar, divider, icon, badge, expansion,
grid-list, sidenav, stepper, tree, datepicker, sort, button-toggle and bottom-sheet were never
rewritten. Also `.mat-form-field-appearance-fill`, `.mat-form-field-invalid` and
`.mat-form-field-disabled` kept the bare `mat-` prefix even though the host became
`.mat-mdc-form-field`.

#### Full old → new class map (for reference; this repo uses element selectors, so most rows are FYI)

| Component | OLD class | NEW class |
|---|---|---|
| Card | `.mat-card` | `.mat-mdc-card` |
| Card | `.mat-card-title` / `-subtitle` / `-content` / `-actions` / `-header` / `-footer` / `-avatar` / `-image` | `.mat-mdc-card-title` / `-subtitle` / `-content` / `-actions` / `-header` / `-footer` / `-avatar` / `-image` |
| Card | — | `.mat-mdc-card-header-text` **(new wrapper div inside `mat-card-header`)** |
| Checkbox | `.mat-checkbox` | `.mat-mdc-checkbox` |
| Checkbox | `.mat-checkbox-layout` | *(none — the `<label>` wrapper is gone)* |
| Checkbox | `.mat-checkbox-inner-container` | `.mdc-checkbox` (closest) |
| Checkbox | `.mat-checkbox-frame` | *(none — merged into `.mdc-checkbox__background` border)* |
| Checkbox | `.mat-checkbox-background` / `-checkmark` / `-checkmark-path` / `-mixedmark` | `.mdc-checkbox__background` / `__checkmark` / `__checkmark-path` / `__mixedmark` |
| Checkbox | `.mat-checkbox-label` | `.mdc-label` |
| Checkbox | — | `.mat-mdc-checkbox-touch-target` **(new)** |
| List | `.mat-list-item-content` | `.mdc-list-item__content` |
| List | `.mat-line` | `.mat-mdc-list-item-title` / `.mat-mdc-list-item-line` |
| List | `.mat-list-avatar` / `.mat-list-icon` | `.mat-mdc-list-item-avatar` / `.mat-mdc-list-item-icon` |
| List | `.mat-2-line` / `.mat-3-line` | `.mdc-list-item--with-two-lines` / `--with-three-lines` |
| List | `.mat-multi-line`, `.mat-list-text`, `.mat-list-item-content-reverse` | *(none)* |
| List | `.mat-list-base[dense]` | *(removed — use `@include mat.list-density(-N)`)* |
| List | — | `.mat-mdc-list-item-unscoped-content`, `.mat-mdc-list-item-meta` **(new)** |
| Form field | `.mat-hint` | **`.mat-mdc-form-field-hint`** (renamed, not just prefixed) |
| Form field | `.mat-error` | **`.mat-mdc-form-field-error`** (renamed) |
| Form field | `.mat-input-element` | `.mat-mdc-input-element` |
| Form field | `.mat-form-field-wrapper` | `.mat-mdc-text-field-wrapper` (closest) |
| Form field | `.mat-form-field-label` | `.mdc-floating-label` |
| Form field | `.mat-form-field-underline` / `-ripple` | `.mdc-line-ripple` |
| Form field | `.mat-form-field-outline` | `.mdc-notched-outline` |
| Form field | `.mat-form-field-prefix` / `-suffix` | `.mat-mdc-form-field-icon-prefix` / `-text-prefix` (resp. suffix) |
| Form field | `.mat-form-field-appearance-legacy` / `-standard` | *(gone — appearances removed)* |
| Dialog | `.mat-dialog-container` | `.mat-mdc-dialog-container` |
| Dialog | `.mat-dialog-title` / `-content` / `-actions` | `.mat-mdc-dialog-title` / `-content` / `-actions` |
| Dialog | — | `.mat-mdc-dialog-inner-container`, **`.mat-mdc-dialog-surface`** **(new)** |
| Button | `.mat-button` | `.mat-mdc-button` |
| Button | `.mat-stroked-button` | **`.mat-mdc-outlined-button`** (renamed) |
| Button | `.mat-flat-button` | **`.mat-mdc-unelevated-button`** (renamed) |
| Button | `.mat-raised-button` | `.mat-mdc-raised-button` |
| Button | `.mat-fab` / `.mat-mini-fab` | `.mat-mdc-fab` / `.mat-mdc-mini-fab` (+ `.mat-mdc-fab-base`) |
| Button | `.mat-button-wrapper` | `.mdc-button__label` |
| Button | `.mat-button-focus-overlay` | `.mat-mdc-button-persistent-ripple` |
| Select | `.mat-select-*` | `.mat-mdc-select-*` |
| Option | `.mat-option-text` | `.mdc-list-item__primary-text` |
| Option | `.mat-selected` / `.mat-active` | `.mdc-list-item--selected` / `.mat-mdc-option-active` |

#### The concrete edits for this repo

**`src/styles/_index.scss:17` and `:25`** — dialog. The v22 DOM adds two nesting levels that did not
exist in v7:

```html
<mat-dialog-container class="mat-mdc-dialog-container mdc-dialog">
  <div class="mat-mdc-dialog-inner-container mdc-dialog__container">
    <div class="mat-mdc-dialog-surface mdc-dialog__surface">
      <!-- AddSocketComponent -->
    </div>
  </div>
</mat-dialog-container>
```

I extracted every padding rule from the compiled dialog CSS: **neither `.mat-mdc-dialog-container`
nor `.mat-mdc-dialog-surface` has any padding.** Padding lives only on `.mat-mdc-dialog-title` /
`-content` / `-actions`. And `overflow: auto` moved off the container onto `.mat-mdc-dialog-content`.

```diff
- .cdk-overlay-container mat-dialog-container {
-   overflow: visible;
- }
+ .cdk-overlay-container .mat-mdc-dialog-surface {
+   overflow: visible;
+ }

- .add-socket-dialog mat-dialog-container {
-   padding: 0;
- }
+ // DELETE — zero padding is already the v22 default.
+ // If mat-dialog-content is ever introduced, zero it via tokens instead:
+ //   .add-socket-dialog { --mat-dialog-content-padding: 0; --mat-dialog-actions-padding: 0; }
```

Also note: the v7 dialog triggered an extra change-detection cycle; v22 does not. This can unmask
latent CD bugs in `AddSocketComponent`.

**`src/app/components/edit-node/edit-node.component.scss:34`** — the `mat-label` transform now
fights Material's own float animation:

```diff
- mat-list-item {
-   mat-label {
-     color: #0009;
-     font-size: 16px;
-     transform: scale(0.75);
-   }
- }
+ // DELETE. Material 22 renders <mat-label> inside .mdc-floating-label and animates
+ // its own transform. Style it with tokens if needed:
+ //   html { @include mat.form-field-overrides((label-text-color: #0009)); }
```

**`src/app/components/edit-node/edit-node.component.scss:22,30`** — see the list-item rebuild in
[2.6](#26). Once `<mat-list>`/`<mat-list-item>` are replaced by plain elements, both rules should be
rewritten against the new class names you choose.

**Card padding — 10 cards.** v7 had `.mat-card { display:block; padding:16px }`. v22:

```css
.mat-mdc-card { display:flex; flex-direction:column; box-sizing:border-box;
                position:relative; border-style:solid; border-width:0; /* NO padding */ }
.mat-mdc-card-content { display:block; padding: 0 16px; }
.mat-mdc-card-content:first-child { padding-top: 16px; }
.mat-mdc-card-content:last-child  { padding-bottom: 16px; }
.mat-mdc-card-header  { display:flex; padding: 16px 16px 0; }
.mat-mdc-card-actions { display:flex; min-height:52px; padding: 8px; }
.mat-mdc-card-title   { line-height: normal; /* NO padding */ }
```

Three consequences: the card lost `padding:16px` and became a flex column (affects rows 5, 7 in
[1c](#1c)); bare `<mat-card-title>` gets zero horizontal padding and sits flush against the card edge
(5 sites — see below); and `mat-card-content` no longer applies typography (add
`@include mat.typography-hierarchy()` and e.g. `class="mat-body-1"` if you relied on it).

The five bare titles — `src/app/nodes/tap/tap.component.html:8,12,18`,
`src/app/nodes/random-numbers/random-numbers.component.html:50`,
`src/app/nodes/stats/stats.component.html:45` — should be wrapped:

```diff
  <mat-card class="current">
-   <mat-card-title>Current value</mat-card-title>
+   <mat-card-header>
+     <mat-card-title>Current value</mat-card-title>
+   </mat-card-header>
    <mat-card-content>{{value}}</mat-card-content>
  </mat-card>
```

<a name="26"></a>
### 2.6 Cards, form fields, lists, dialog, buttons — behavioural changes

#### Form field — 6 fields

Material 7's default was `legacy` (bare underline, placeholder-as-floating-label). v22:
`MatFormFieldAppearance = 'fill' | 'outline'`, default `'fill'`. `legacy` and `standard` were deleted
in v15 and now **throw at runtime**:

```
Error: MatFormField: Invalid appearance "standard", valid values are "fill" or "outline".
```

Closest match to the old look, and recommended for this app:

```ts
// app.module.ts providers
{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }
```

Fix B2 by adding `<mat-label>` to the five placeholder-only fields:

```diff
  <mat-form-field>
+   <mat-label>Socket name</mat-label>
    <input matInput formControlName="name" placeholder="Socket name">
  </mat-form-field>
```

Sites: `src/app/nodes/custom-code/custom-code.component.html:8-9` ("Input format"), `:17-18`
("Output format"), `src/app/nodes/default-flow/add-socket/add-socket.component.html:9-10`
("Socket name"), `src/app/components/edit-node/edit-node.component.html:3-5` ("Title"), `:22-24` and
`:45-47` ("Socket name"). The two "Colors" fields at `:25-29` and `:48-52` already have labels.

Other form-field changes: fields grow taller (internal padding plus a fixed-size subscript wrapper
reserving a line for hints/errors — `subscriptSizing: 'fixed'` default); `matPrefix`/`matSuffix` are
deprecated and now behave as *icon* affixes (use `matTextPrefix`/`matTextSuffix` for text);
`floatLabel="never"` is rejected; `MatInput` must now live inside a `mat-form-field`; and the native
date-picker indicator on `input[type=date]` is hidden.

#### `matLine` — 6 usages, all no-ops now

`src/app/components/edit-node/edit-node.component.html:3, 22, 25, 45, 48`.

`MatLine` (`[mat-line], [matLine]`) **still exists** in `@angular/material/core` — but in v22 it is
consumed **only by `grid-list`**. `MatListItem`'s content queries are `_titles → MatListItemTitle`,
`_lines → MatListItemLine`, `_meta → MatListItemMeta`. So `matLine` inside a list item matches a
directive that does nothing there. **Silent no-op.** In this app it was already semantically odd
(`matLine` on a `<mat-form-field>`), so just delete the attribute.

| v7 | v22 |
|---|---|
| `matLine` (first) | `matListItemTitle` |
| `matLine` (subsequent) | `matListItemLine` |
| `matListIcon` | `matListItemIcon` |
| `matListAvatar` | `matListItemAvatar` |
| *(unscoped content → meta)* | `matListItemMeta` |

#### List sizing

| | v7 | v22 |
|---|---|---|
| 1 line | `height: 48px` | `height: 48px` |
| 2 lines | `height: 72px` | **`height: 64px`** |
| 3 lines | `88px` | `88px` |
| multi-line | `.mat-multi-line { height: auto }` | *(no equivalent)* |
| item h-padding | on `.mat-list-item-content` | on `.mdc-list-item` itself |
| list padding | `.mat-list-base { padding-top: 8px }` | `.mdc-list { padding: 8px 0 }` |
| `dense` | `.mat-list-base[dense]` | removed — `@include mat.list-density(-N)` |

#### `edit-node.component.html` — replace the list

`<mat-list-item>` in v22 is a rigid, fixed-height, nowrap, `overflow:hidden`, text-oriented MDC row.
The rows here contain an absolutely-positioned mini-fab plus two form fields. Use plain elements:

```diff
- <mat-list class="socket-in">
-   <mat-list-item *ngFor="let socket of sockets | socketIn; let i = index">
+ <div class="socket-list socket-in">
+   <div class="socket-row" *ngFor="let socket of sockets | socketIn; let i = index">
      <button *ngIf="deleteSocket" #action mat-mini-fab color="warn" ...>
        <mat-icon>delete_forever</mat-icon>
      </button>
      ...
-     <mat-form-field matLine>
+     <mat-form-field>
+       <mat-label>Socket name</mat-label>
        <input matInput placeholder="Socket name" [(ngModel)]="socket.name">
      </mat-form-field>
-   </mat-list-item>
- </mat-list>
+   </div>
+ </div>
```

with SCSS replacing `edit-node.component.scss:22,30`:

```scss
.socket-list {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  width: 50%;
}

.socket-row {
  display: flex;
  flex-direction: column;
  margin: 32px 0;
  position: relative;
}
```

`component-selection.component.html:7-11` (a single `<button mat-button>` per item) will still
*work* at 48px, just look cramped. Either keep it or switch to `<mat-action-list>` with
`<button mat-list-item>`.

#### Buttons — old attributes still work

**`mat-button`, `mat-stroked-button`, `mat-fab`, `mat-mini-fab` all still work in 22.1.** Verbatim
from `types/button.d.ts`, the `MatButton` selector is:

```
button[matButton], a[matButton], button[mat-button], button[mat-raised-button],
button[mat-flat-button], button[mat-stroked-button], a[mat-button], a[mat-raised-button],
a[mat-flat-button], a[mat-stroked-button]
```

plus `MatFabButton` = `button[mat-fab], a[mat-fab], button[matFab], a[matFab]` and
`MatMiniFabButton` = `button[mat-mini-fab], a[mat-mini-fab], button[matMiniFab], a[matMiniFab]`.
`button.mjs`'s `_inferAppearance()` maps the old attributes to appearances. **Zero `@deprecated`
tags** on any of them — they are soft-deprecated by documentation only.

Recommended modernization (optional):

| v7 | v22 recommended |
|---|---|
| `mat-button` | `matButton` (or `matButton="text"`) |
| `mat-stroked-button` | `matButton="outlined"` |
| `mat-raised-button` | `matButton="elevated"` |
| `mat-flat-button` | `matButton="filled"` |
| `mat-fab` | `matFab` |
| `mat-mini-fab` | `matMiniFab` |
| `mat-icon-button` | `matIconButton` |
| — | `matButton="tonal"` (new) |

Invalid appearance values throw: ``Error: Unsupported MatButton appearance "foo"``.
Other changes: icon-button is 48×48 (was 40×40); `letter-spacing: 1.25px`; icons project **before**
text regardless of DOM order (use `iconPositionEnd` to move them after).

#### Select / option / autocomplete

`<mat-select placeholder="...">` **still supported** (`placeholder` is in `MatSelect`'s input list) —
`src/app/nodes/fractal/fractal.component.html:4` needs no change. `[matAutocomplete]` API unchanged.

Behavioural: option height is no longer capped at 48px; long options **wrap** instead of ellipsizing;
panels gain 8px vertical padding; the select dropdown is now exactly the form-field's width (v7
allowed wider) — a new `panelWidth` input overrides this. And `mat-option` now also carries
`.mdc-list-item`, so generic list CSS can bleed into options.

#### Checkbox

Host `<mat-checkbox>` unchanged, so `random-numbers.component.scss:67` keeps working. Touch target
grew 16px → 40px (restore with `@include mat.checkbox-density(-1)`); do not call `preventDefault()`
on `click`; text styles are no longer inherited.

#### Animations — drop the package entirely

`src/app/app.module.ts:12,64` imports `BrowserAnimationsModule`. In 22.1 that class is annotated:

> `@deprecated 20.2 Use 'animate.enter' or 'animate.leave' instead. Intent to remove in v23`

The same tag is on `NoopAnimationsModule`, `provideAnimations()` **and `provideAnimationsAsync()`** —
so `provideAnimationsAsync()` is *not* the modern replacement; it is another deprecated API.

**And Material 22 has no dependency on `@angular/animations` at all.** It is absent from Material's
`peerDependencies`, and `grep -rl "@angular/animations"` across all of Material's `fesm2022/` and
`types/` returns only a stale source-map string. Material 22 animates with native CSS.

```diff
- import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
  ...
  imports: [
    BrowserModule,
-   BrowserAnimationsModule,
    ...
  ]
```

To disable Material animations (e.g. in tests):
`{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }` from
`@angular/material/core`.

Note `BrowserModule` itself is **not** deprecated in v22 — keep it for the NgModule app.

---

<a name="part-3"></a>
## Part 3 — Non-Material blockers

<a name="31"></a>
### 3.1 Polyfills — delete `src/polyfills.ts`

Angular 22 has no `polyfills.ts`. The `@angular/build:application` schema declares `polyfills` as
`{"type": "array"}` — *"A list of polyfills to include in the build… Example: 'zone.js'."* — and the
application schematic writes `polyfills: options.zoneless ? undefined : ['zone.js']`.

**Zoneless is the default from v21.** A v22 `ng new` installs **no zone.js at all** and has **no
`polyfills` key**. Keeping zones is therefore an explicit opt-*in*.

| OLD (`src/polyfills.ts`) | NEW |
|---|---|
| `:46` `import 'core-js/es7/reflect'` | **DELETE.** Reflect metadata is unnecessary with Ivy AOT. Drop `core-js` from `package.json`. |
| `:74` `import 'zone.js/dist/zone'` | → `"polyfills": ["zone.js"]` in `angular.json`, plus `zone.js@~0.15.0`. The `dist/*` deep paths were **hard-removed in zone.js 0.14.0**. |
| `:83` `import 'pepjs'` | **DELETE** — but see the touch-action warning below. |
| `:86` `import 'path-browserify'` | **DELETE.** Nothing in browser code imports `path` (the only `require('path')` calls are in the `karma.conf.js` files, which run in Node). The esbuild builder does **no** Node core-module shimming — a browser `import 'path'` is a hard build error: `Could not resolve "path"`. Drop `path-browserify`. |
| `src/browserslist` | **DELETE.** It was already dead code: browserslist only walks the project root and its ancestors, never `src/`. Angular 22's default is `baseline widely available on 2026-05-07`. |

> 🔴 **`pepjs` removal has a real trap.** pepjs synthesised Pointer Events *and* honoured a
> `touch-action` **attribute**. Native Pointer Events require the `touch-action` **CSS property**, or
> the browser scrolls/pans instead of delivering pointermove. The library genuinely relies on pointer
> events — `projects/flow-based/src/lib/flow-based.component.ts:55,62`,
> `drag-drop/draggable/draggable.directive.ts:20,32,37`, `socket/socket.component.ts:98`,
> `connection-lines/connection-lines.component.html:12`. I grepped `src/` and `projects/` for
> `touch-action`: **zero occurrences.** **Add `touch-action: none`** to the draggable surfaces and
> canvases (`.draggable`, `canvas`, `xxl-flow-based`) or dragging breaks on touch devices.

**`src/test.ts` → delete too.** `zone.js/dist/zone-testing` becomes `zone.js/testing`, but the whole
file is obsolete: `@angular/build:unit-test` auto-discovers specs (`include` defaults to
`["**/*.spec.ts", "**/*.test.ts"]`) and offers `setupFiles` / `providersFile` for global setup. The
`require.context('./', true, /\.spec\.ts$/)` idiom is webpack-only and does not work under esbuild.
Delete `src/karma.conf.js` as well — v22 defaults to vitest.

Out of scope but shares the toolchain: `projects/flow-based/src/test.ts:3` has the same
`core-js/es7/reflect` import.

**Keep zone.js for this migration.** The app leans hard on `setTimeout` plus `detectChanges()` /
`markForCheck()` — `random-numbers.component.ts:45`, `merge-streams.component.ts:48,56`,
`edit-node.component.ts:52`, `custom-code.component.ts:97`, `normal-node.component.ts:54` — and
drives updates from Web Workers and editor callbacks. Going zoneless is a separate project.

<a name="32"></a>
### 3.2 `src/main.ts`

```diff
- import { enableProdMode } from '@angular/core';
- import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
+ import { platformBrowser } from '@angular/platform-browser';
  import { AppModule } from './app/app.module';
- import { environment } from './environments/environment';
-
- import 'hammerjs';
- import 'codemirror/mode/javascript/javascript';
-
  import { GoogleCharts } from 'google-charts';

- if (environment.production) {
-   enableProdMode();
- }
-
  GoogleCharts.load(() => {
-   platformBrowserDynamic().bootstrapModule(AppModule)
-     .catch(err => console.log(err));
+   platformBrowser().bootstrapModule(AppModule)
+     .catch(err => console.error(err));
  });
```

| OLD | NEW | Why |
|---|---|---|
| `:7` `import 'hammerjs'` | **DELETE** | Removed from Angular in 22.0.0; Material never needs it ([2.4](#24)) |
| `:8` `import 'codemirror/mode/javascript/javascript'` | **DELETE** | CM6 has no global mode registry — the language is an extension ([Part 4](#part-4)) |
| `:10` `import { GoogleCharts } from 'google-charts'` | **KEEP** with a type shim | see below |
| `:2,17` `platformBrowserDynamic()` | `platformBrowser()` from `@angular/platform-browser` | annotated `@deprecated Use the 'platformBrowser' function instead from '@angular/platform-browser'` |
| `enableProdMode()` + `environment.production` | **DELETE both** | The CLI strips dev-mode code via `optimization`; `fileReplacements` on `src/environments/*` is legacy. Use `isDevMode()` from `@angular/core` if a runtime check is ever needed. |

#### `google-charts` — keeps working, needs a type shim

Latest is **2.0.0, published 2018-12-30** — unmaintained but functional. It ships
`main: dist/googleCharts.js` (CJS) **and** `module: dist/googleCharts.esm.js`, and I confirmed the
ESM build ends with `export default GoogleChartsManager; export { GoogleCharts };` — so
`import { GoogleCharts } from 'google-charts'` resolves cleanly under esbuild.

Two things to handle:

1. **No type declarations.** Under TS 6's default-strict this is a hard error (verified):
   `TS7016: Could not find a declaration file for module 'google-charts'`. Add a shim —
   **create `src/types/google-charts.d.ts`**:

   ```ts
   declare module 'google-charts' {
     export const GoogleCharts: {
       load(callback: () => void, config?: string | { packages: string[] }): void;
       api: any;
     };
   }
   ```

2. **CommonJS warning** on production builds — add `"google-charts"` to
   `allowedCommonJsDependencies` (see [Part 6](#part-6)).

Usage sites, all unchanged otherwise: `src/main.ts:10,16`;
`src/app/nodes/basic-graph/basic-graph.component.ts:4,32,33,46,47,50,54`;
`src/app/nodes/stats/stats.component.ts:6,34,36-37,46,48`.

It loads Google's loader from `gstatic.com` at runtime — a CSP consideration, not a build blocker.

<a name="33"></a>
### 3.3 Sass: `@import`, `includePaths`, division

`@angular/build@22.1.0` pins **`sass: 1.101.0`**. **Dart Sass 3.0.0 has NOT shipped** — the line is
still 1.x. `@import` was deprecated in Dart Sass 1.80.0 with removal *"no sooner than two years
after"*, targeted at 3.0.0. So **`@import` is fully functional in Angular 22 — warning only.**
`@use`/`@forward` is recommended, not required.

I compiled all 23 `.scss` files in `src/` with `sass@1.101.0 --load-path=src/styles
--load-path=projects/flow-based/src/lib/`. **Every one exited 0. Zero errors.** Deprecations emitted:

| Deprecation ID | Removal target | Sites in this repo |
|---|---|---|
| `[import]` | **Dart Sass 3.0.0** | all 19 `@import` sites ([1e](#1e)) |
| `[slash-div]` | **Dart Sass 2.0.0** ← nearer | `src/app/context-menu/context-menu.component.scss:51,52,81,82,98,137,144`; `src/styles/utils/_trigonometry.scss:9,12,36,47,57,63` |
| `[global-builtin]` | Dart Sass 3.0.0 | `projects/flow-based/src/lib/utils/_utils.scss:2` (`type-of`), `:7-10` (`nth`), `:17,24,31,38` (`unitless`); `src/styles/utils/_trigonometry.scss:8` (`unit`) |

Neither Dart Sass 2.0 nor 3.0 exists yet, so this is genuinely deferrable.

**`stylePreprocessorOptions.includePaths` still exists and works** — the builder maps it straight to
Dart Sass's modern `loadPaths` (`sass-language.js: loadPaths: options.includePaths`). There is no
`loadPaths` key in the schema; `includePaths` *is* how you set it. **No change needed to that block.**

**New escape hatch — `stylePreprocessorOptions.sass.silenceDeprecations`**, empirically confirmed to
silence all three IDs while still building:

```json
"stylePreprocessorOptions": {
  "includePaths": ["src/styles", "projects/flow-based/src/lib/"],
  "sass": { "silenceDeprecations": ["import", "global-builtin", "slash-div"] }
}
```

Sibling options: `fatalDeprecations`, `futureDeprecations`.

When you do modernize, the edits are mechanical:

```diff
- @import 'utils/utils';
+ @use 'utils/utils' as utils;
  .x { @include utils.fb-position(absolute, 0 0 0 0); }
```

```diff
+ @use 'sass:math';
- margin-left: -$width/2;
+ margin-left: math.div(-$width, 2);
```

```diff
+ @use 'sass:list';
+ @use 'sass:meta';
- @if type-of($position) == list { ... }
+ @if meta.type-of($position) == list { ... }
- $top: nth($coordinates, 1);
+ $top: list.nth($coordinates, 1);
```

Official tool: `npx sass-migrator module --migrate-deps src/**/*.scss`. Note `@use` is namespaced and
**not** transitive — each component file must `@use` what it needs directly.

Also verified: the user-defined `sin()`, `cos()`, `tan()`, `pow()` in
`src/styles/utils/_trigonometry.scss` do **not** conflict with CSS's math functions. Since Dart Sass
1.67 those names parse as calculations, but a user-defined function of the same name always wins.
`context-menu.component.scss` compiled correctly.

And `src/app/nodes/basic-graph/basic-graph.component.scss:1`'s `@import './utils/utils'` — an
explicitly-relative path with no matching sibling file — **does** resolve via load path #2 under
dart-sass 1.101. Confirmed by compiling it.

<a name="34"></a>
### 3.4 Removed Angular APIs — searched for, with removal versions

| API | Removed in | Occurrences in `src/` | Replacement |
|---|---|---|---|
| **`entryComponents`** | **v16.0.0** (deprecated v9) — 0 hits in `@angular/core@22.1.0` typings | `src/app/app.module.ts:98-111` (12 components) | **Delete the whole block.** Unnecessary since Ivy. |
| **`ComponentFactoryResolver`**, `ComponentFactory`, `resolveComponentFactory()` | **v22.0.0** — *this release* | **none** ✅ | Pass the class directly, or standalone `createComponent()` |
| **`ViewContainerRef.createComponent(factory, index, injector)`** | **v22.0.0** | **none** ✅ | see signature below |
| **`@angular/http`** / `HttpModule` | **v8.0.0** | none in `src/` — but it **is** in `package.json` | Delete the dependency. (`HttpClientModule` is itself deprecated since v18 → `provideHttpClient()`.) |
| **`async()`** from `@angular/core/testing` | **v18.0.0** | **15 spec files**, ~35 call sites | `waitForAsync()` |
| **`Renderer`** (old class) | **v9.0.0** | **none** ✅ | `Renderer2` |
| **`TestBed.get()`** | **v20.0.0** | none ✅ | `TestBed.inject()` |
| `createNgModuleRef` | **v22.0.0** | none ✅ | `createNgModule()` |
| `provideRoutes()` | **v22.0.0** | none ✅ | `provideRouter()` |
| `fullTemplateTypeCheck` | **v22.0.0** | none ✅ | `strictTemplates` |
| `ChangeDetectorRef.checkNoChanges()` | **v22.0.0** | none ✅ | `fixture.detectChanges()` |
| Hammer.js integration / `HammerModule` | **v22.0.0** | `src/main.ts:7` | roll your own ([2.4](#24)) |
| `ReflectiveInjector` | **v16.0.0** | none ✅ | `Injector.create` |
| **`platformBrowserDynamic()`** | ⚠️ deprecated, still published | `src/main.ts:2,17` | `platformBrowser()` from `@angular/platform-browser` |
| **`BrowserDynamicTestingModule` / `platformBrowserDynamicTesting`** | ⚠️ deprecated | `src/test.ts:5-8,13-16` | `BrowserTestingModule` / `platformBrowserTesting` from `@angular/platform-browser/testing` — file is being deleted anyway |
| **`BrowserAnimationsModule`** | ⚠️ `@deprecated 20.2 … Intent to remove in v23` | `src/app/app.module.ts:12,64` | **Delete** — Material 22 needs no animations ([2.6](#26)) |
| `ModuleWithProviders` without generic | generic mandatory since **v10.0.0** | none in `src/` | `ModuleWithProviders<T>` |
| `inject([Token], fn)` (TestBed) | ✅ **still exported**, `@publicApi`, no `@deprecated` | `src/app/component-selection.service.spec.ts:1,12` | no change required |
| **TSLint / codelyzer** | builder removed **CLI 13.0.0** | `angular.json` lint targets ×3, `tslint.json`, `src/tslint.json` | `ng add angular-eslint` → `@angular-eslint/builder:lint` |
| **Protractor** | builder removed **CLI 19.0.0** | `e2e/` (4 files), `angular.json` e2e target | Playwright / Cypress — or delete |
| `@angular-devkit/build-ng-packagr` | **CLI 11.0.0** | `angular.json` library build | `@angular/build:ng-packagr` |
| **`@angular-devkit/build-angular:browser`** | ⚠️ **deprecated in v22**, still present | `angular.json` build target | `@angular/build:application`. Logs: *"The `@angular-devkit/build-angular:browser` builder is deprecated as part of Angular's Webpack support deprecation."* Skip it; go straight to the application builder. |
| **`target: "es5"`** | ES5 **output** removed **CLI 15.0.0** | `tsconfig.json:19`, `e2e/tsconfig.e2e.json` | `ES2022`. The builder silently rewrites `target` to ES2022 with a warning; tsc 6.0 separately emits `TS5107: Option 'target=ES5' is deprecated and will stop functioning in TypeScript 7.0`. |
| `@NgModule` apps | ✅ **still fully supported in v22** | — | optional: `ng generate @angular/core:standalone` |

#### `ViewContainerRef.createComponent` — exact v22 signature

```ts
abstract createComponent<C>(componentType: Type<C>, options?: {
  index?: number;
  injector?: Injector;
  ngModuleRef?: NgModuleRef<unknown>;
  environmentInjector?: EnvironmentInjector | NgModuleRef<unknown>;
  projectableNodes?: Node[][];
  directives?: (Type<unknown> | DirectiveWithBindings<unknown>)[];
  bindings?: Binding[];
}): ComponentRef<C>;
```

#### `src/app/app.module.ts:98-111` — delete `entryComponents`

```diff
-   entryComponents: [
-     AddSocketComponent,
-     ComponentSelectionComponent,
-     BasicGraphComponent,
-     RandomNumbersComponent,
-     TapComponent,
-     DefaultFlowComponent,
-     MergeStreamsComponent,
-     StatsComponent,
-     CustomCodeComponent,
-     FractalComponent,
-     CanvasComponent,
-     ZoomCanvasComponent
-   ],
    bootstrap: [AppComponent]
```

#### `async()` → `waitForAsync()` — all 15 files

`src/app/app.component.spec.ts:1,4,11,16,21` ·
`src/app/context-menu/context-menu.component.spec.ts:1,9` ·
`src/app/nodes/merge-streams/merge-streams.component.spec.ts:1,9` ·
`src/app/nodes/zoom-canvas/zoom-canvas.component.spec.ts:1,9` ·
`src/app/nodes/basic-graph/basic-graph.component.spec.ts:1,9` ·
`src/app/nodes/random-numbers/random-numbers.component.spec.ts:1,9` ·
`src/app/nodes/fractal/fractal.component.spec.ts:1,9` ·
`src/app/nodes/stats/stats.component.spec.ts:1,9` ·
`src/app/nodes/default-flow/default-flow.component.spec.ts:1,9` ·
`src/app/nodes/default-flow/add-socket/add-socket.component.spec.ts:1,9` ·
`src/app/components/normal-node/normal-node.component.spec.ts:1,9` ·
`src/app/components/component-selection/component-selection.component.spec.ts:1,9` ·
`src/app/components/default-front/default-front.component.spec.ts:1,9` ·
`src/app/flow/flow.component.spec.ts:1,9` ·
`src/app/nodes/canvas/canvas.component.spec.ts:1,9`

```diff
- import { async, ComponentFixture, TestBed } from '@angular/core/testing';
+ import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
  ...
-   beforeEach(async(() => {
+   beforeEach(waitForAsync(() => {
```

**Recommendation: delete the spec suite instead.** `src/app/app.component.spec.ts` asserts
`app.title === 'app'` (no such property) and that an `<h1>` contains `'Welcome to app!'` (no `<h1>`
in the template) — it is already broken. Every other spec is a bare scaffolded "should create" that
will fail without provider setup (`NodeService`, `XXL_FLOW_TYPES`, `FB_SOCKET_COLORS`,
`MAT_DIALOG_DATA`, …). Migrating them buys nothing.

#### Also delete

- `src/app/app.component.ts:30` — `@ViewChild('bg') bgImage: ElementRef;`. The `#bg` template ref no
  longer exists in `app.component.html`; dead code.
- `src/app/nodes/merge-streams/merge-streams.component.scss:24` — `mat-toolbar { … }`, dead code.
- `src/app/app.module.ts:20,77` — `MatTooltipModule`, unused.
- `src/environments/` — both files, once `enableProdMode` is gone.

<a name="35"></a>
### 3.5 Strict mode: the complete TS2564 list — 70 sites

TypeScript 6.0 enables `strict` (and therefore `strictPropertyInitialization`) by default. Every
field below has a type annotation, no initializer, is not optional, is not `!`-asserted, and is **not
assigned in the constructor** — so each is a `TS2564` error. I computed this by parsing each
constructor body, not by grepping the whole file.

Fix each by adding `!` (or `?`, or an initializer). Signal-based alternatives are noted after the
list.

#### `src/app/app.component.ts`
| Line | Field |
|---|---|
| 26 | `activeOverlay: OverlayRef \| null;` → `activeOverlay: OverlayRef \| null = null;` |
| 30 | `@ViewChild('bg') bgImage: ElementRef;` → **delete (dead code)** |

#### `src/app/components/component-selection/component-selection.component.ts`
| Line | Field |
|---|---|
| 11 | `flowKeys: string[];` |

#### `src/app/components/default-front/default-front.component.ts`
| Line | Field |
|---|---|
| 10 | `@Input() title: string;` |
| 11 | `@ViewChild('img') ref: ElementRef;` |

#### `src/app/components/edit-node/edit-node.component.ts`
| Line | Field |
|---|---|
| 23 | `sockets: XxlSocket[];` |
| 24 | `state: FbNodeState;` |
| 28 | `@ViewChildren('action', {read: ElementRef}) refs: QueryList<ElementRef>;` |
| 30 | `public socketDetails: SocketDetails[];` |

#### `src/app/components/node-header/node-header.component.ts`
| Line | Field |
|---|---|
| 9 | `@Input() title: string;` |

#### `src/app/components/normal-node/normal-node.component.ts`
| Line | Field |
|---|---|
| 19 | `@Input() label: string;` |

#### `src/app/flow/flow.component.ts`
| Line | Field |
|---|---|
| 11 | `@Input() flow: XxlFlow;` |

#### `src/app/nodes/basic-graph/basic-graph.component.ts`
| Line | Field |
|---|---|
| 20 | `@ViewChild('graph') graph: ElementRef;` |
| 24 | `worker: BasicGraphWorker;` |

#### `src/app/nodes/canvas/canvas.component.ts`
| Line | Field |
|---|---|
| 11 | `@ViewChild('canvas') canvas: ElementRef;` |
| 13 | `private worker: CanvasWorker;` |

#### `src/app/nodes/custom-code/custom-code.component.ts`
| Line | Field |
|---|---|
| 17 | `private worker: CustomCodeWorker;` |
| 19 | `public error: boolean;` → `public error = false;` |
| 20 | `private editor: any;` |
| 25 | `@ViewChild('code') codeRef: ElementRef;` |

#### `src/app/nodes/default-flow/add-socket/add-socket.component.ts`
| Line | Field |
|---|---|
| 16 | `socketForm: FormGroup;` |
| 17 | `isNew: boolean;` |

#### `src/app/nodes/default-flow/default-flow.component.ts`
| Line | Field |
|---|---|
| 14 | `@Input() title: string;` |
| 15 | `private worker: any;` |
| 16 | `private clickSubscription: Subscription;` |
| 17 | `private dialogRef: MatDialogRef<any> \| null;` → `= null;` |

#### `src/app/nodes/fractal/fractal.component.ts`
| Line | Field |
|---|---|
| 13 | `private worker: FractalsWorker;` |

#### `src/app/nodes/merge-streams/merge-streams.component.ts`
| Line | Field |
|---|---|
| 26 | `worker: MergeStreamsWorker;` |
| 32 | `private clickSubscription: Subscription;` (never assigned anywhere — consider deleting) |
| 34 | `@ViewChild('output', {read: ElementRef}) output: ElementRef;` |
| 35 | `@ViewChildren('inputs', {read: ElementRef}) inputs: QueryList<ElementRef>;` |

#### `src/app/nodes/random-numbers/random-numbers.component.ts`
| Line | Field |
|---|---|
| 15 | `worker: RandomNumbersWorker;` |
| 16 | `configForm: FormGroup;` |
| 19 | `currentValue: number;` |
| 20 | `private clickSubscription: Subscription;` (never assigned — consider deleting) |
| 21 | `private valueSubscription: Subscription;` |

#### `src/app/nodes/stats/stats.component.ts`
| Line | Field |
|---|---|
| 14 | `public worker: StatsWorker;` |
| 18 | `private graphPlaceHolder: ElementRef;` |

#### `src/app/nodes/tap/tap.component.ts`
| Line | Field |
|---|---|
| 13 | `public worker: TapWorker;` |
| 18 | `value: any;` |
| 19 | `values: any[];` (never assigned — consider deleting) |

#### `src/app/nodes/zoom-canvas/zoom-canvas.component.ts`
| Line | Field |
|---|---|
| 14 | `private worker: ZoomCanvasWorker;` |
| 15 | `private label: string;` |
| 16 | `private left: number;` |
| 17 | `private top: number;` |
| 18 | `private startX: number;` |
| 19 | `private startY: number;` |
| 21 | `private ctx: any;` |
| 22 | `private imageData: ImageData;` |
| 23 | `public dimensions: IDimensions;` |
| 24 | `private startTime: number;` |
| 26 | `@ViewChild('canvas') canvas: ElementRef;` |

#### `src/app/workers/canvas.ts`
| Line | Field |
|---|---|
| 19 | `private stream: Observable<any>;` |
| 25 | `private imageData: number[];` (never assigned) |

#### `src/app/workers/custom-code.ts`
| Line | Field |
|---|---|
| 22 | `public compileError: Error \| null;` → `= null;` |
| 23 | `public runtimeError: Error \| null;` → `= null;` |

#### `src/app/workers/fractals.ts`
| Line | Field |
|---|---|
| 64 | `private webWorker: FbWebWorker<ImageData>;` |
| 69 | `private x: number;` |
| 70 | `private y: number;` |

#### `src/app/workers/fractals/julia.ts`
| Line | Field |
|---|---|
| 12 | `xScale: number;` |
| 13 | `yScale: number;` |

#### `src/app/workers/fractals/mandelbrot.ts`
| Line | Field |
|---|---|
| 12 | `xScale: number;` |
| 13 | `yScale: number;` |

#### `src/app/workers/merge-streams.ts`
| Line | Field |
|---|---|
| 24 | `private subscription: Subscription;` |
| 29 | `public outputValue: number;` |

#### `src/app/workers/random-numbers.ts`
| Line | Field |
|---|---|
| 25 | `private intervalId: number;` |

#### `src/app/workers/tap.ts`
| Line | Field |
|---|---|
| 18 | `private stream: Observable<any>;` |
| 23 | `public currentValue: any;` |

#### `src/app/workers/utils/random.ts`
| Line | Field |
|---|---|
| 5 | `private state: number;` |

#### `src/app/workers/webworker.ts`
| Line | Field |
|---|---|
| 2 | `private worker: Worker;` |

**Total: 70 sites.**

#### Also expect `TS7006` (implicit `any`) on these

Reachable-from-template methods with untyped parameters:
`src/app/components/edit-node/edit-node.component.ts:72` `setSocketColor(color, socket)`;
`src/app/app.component.ts:85` `escape(event)`;
`src/app/nodes/custom-code/custom-code.component.ts:83` `onActive(isActive)`.
Add explicit types (`string`, `KeyboardEvent`, `boolean`).

#### Optional: signal queries instead of `!`

`@ViewChild`/`@ViewChildren` sites are better expressed as signal queries, which sidestep TS2564
entirely and are correctly typed:

```diff
- @ViewChild('canvas') canvas: ElementRef;
+ readonly canvas = viewChild.required<ElementRef>('canvas');
```

Usage changes from `this.canvas.nativeElement` to `this.canvas().nativeElement`. Automated:
`ng generate @angular/core:signal-queries`. Similarly `@Input() title: string;` →
`readonly title = input<string>();` via `ng generate @angular/core:signal-input-migration`.

---

<a name="part-4"></a>
## Part 4 — CodeMirror 5 → CodeMirror 6

Affects `src/app/nodes/custom-code/custom-code.component.ts`,
`src/app/nodes/custom-code/custom-code.component.html:27`, `src/app/app.module.ts:13,79`,
`src/main.ts:8`, and the `styles` array in `angular.json`.

Verified package facts: `codemirror@6.0.2` is a small meta-package re-exporting `EditorView` from
`@codemirror/view` plus a `basicSetup` extension bundle. Latest component packages:
`@codemirror/view@6.43.7`, `@codemirror/state@6.7.1`, `@codemirror/lang-javascript@6.2.5`,
`@codemirror/theme-one-dark@6.1.3`. All are `"type": "module"` with proper `exports` maps.

### 🔴 CM6 ships no CSS — the `angular.json` styles entries go away

I checked every CM6 package for `.css` files: **zero in all of them.** CodeMirror 6 injects its
styles at runtime via `StyleModule`, and themes are *extensions*, not stylesheets.

```diff
  "styles": [
-   "node_modules/@angular/material/prebuilt-themes/indigo-pink.css",
-   "node_modules/codemirror/lib/codemirror.css",
-   "node_modules/codemirror/theme/material.css",
    "src/styles.scss"
  ]
```

All three go: the two CodeMirror files because CM6 has no CSS, and the Material prebuilt theme
because `src/styles.scss` now does the theming via `mat.theme()` ([2.3](#23)).

The old `theme: 'material'` option maps to the `oneDark` extension (the closest maintained dark
theme). If you want to stay light, simply omit any theme extension.

### `src/main.ts:8` — delete the mode import

```diff
- import 'codemirror/mode/javascript/javascript';
```

CM6 has no global mode registry. The language is an extension passed per-editor:
`javascript()` from `@codemirror/lang-javascript`.

### `src/app/app.module.ts` — remove `CodemirrorModule`

`@ctrl/ngx-codemirror` is a CodeMirror **5** wrapper and is **already unused** — I grepped every
template for `ngx-codemirror` / `<ngx-codemirror>` and found nothing. The component constructs the
editor imperatively. So this is a pure deletion, not a replacement:

```diff
- import { CodemirrorModule } from '@ctrl/ngx-codemirror';
  ...
  imports: [
    ...
-   CodemirrorModule,
    ...
  ]
```

Drop `@ctrl/ngx-codemirror` and `@types/codemirror` from `package.json`. CM6 ships its own types, so
no `@types` package is needed. **CM6 needs no `allowedCommonJsDependencies` entry** — it is pure ESM.

### The template stays as-is

`src/app/nodes/custom-code/custom-code.component.html:27` —
`<div #code class="code" (change)="onKeyDown()"></div>` — still works as the mount point. The
`(change)` binding is vestigial (CM6 does not emit DOM `change` on the container) and can be removed;
`onKeyDown()` only logs.

### `custom-code.component.ts` — OLD → NEW

**OLD** (`:1-9` imports, `:20` field, `:83-103` construction):

```ts
import { Editor, EditorChangeLinkedList } from 'codemirror';
declare var require: any;
const CodeMirror = require('codemirror');
// ...
private editor: any;
// ...
onActive(isActive): void {
  if (!this.editor) {
    this.editor = CodeMirror(this.codeRef.nativeElement, {
      lineNumbers: true,
      theme: 'material',
      mode: 'javascript',
      value: this.state.config.func
    });

    this.editor.on('change', (cm: Editor, change: EditorChangeLinkedList) => {
      this.worker.compileFunction(cm.getValue());
      this.cdr.detectChanges();
    });
  }
}
```

**NEW:**

```ts
import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, Host, Inject,
  OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
// ... existing NodeService / CustomCodeWorker / FB_SOCKET_COLORS / FormControl imports

export class CustomCodeComponent implements OnInit, AfterViewInit, OnDestroy {
  private editor?: EditorView;

  @ViewChild('code') codeRef!: ElementRef<HTMLElement>;

  onActive(isActive: boolean): void {
    if (this.editor) {
      return;
    }

    this.editor = new EditorView({
      doc: this.state.config.func,
      extensions: [
        basicSetup,          // line numbers, history, brackets, search, autocomplete, …
        javascript(),        // replaces mode: 'javascript'
        oneDark,             // replaces theme: 'material'
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this.worker.compileFunction(update.state.doc.toString());
            this.cdr.detectChanges();
          }
        }),
      ],
      parent: this.codeRef.nativeElement,
    });
  }

  ngOnDestroy(): void {
    this.editor?.destroy();      // CM6 requires explicit teardown
  }
}
```

Verified against the shipped typings: `EditorViewConfig extends EditorStateConfig`, giving `doc`
(`string | Text`), `extensions`, `selection`, plus `parent?: Element | DocumentFragment` and
`root?: Document | ShadowRoot`. `EditorView.updateListener` is a
`Facet<(update: ViewUpdate) => void>`; `ViewUpdate` exposes `docChanged: boolean` and `state`.

### API translation table

| CodeMirror 5 | CodeMirror 6 |
|---|---|
| `CodeMirror(el, opts)` | `new EditorView({ ...opts, parent: el })` |
| `value: '...'` | `doc: '...'` |
| `lineNumbers: true` | included in `basicSetup`, or `lineNumbers()` from `@codemirror/view` |
| `mode: 'javascript'` | `javascript()` from `@codemirror/lang-javascript` |
| `theme: 'material'` + a CSS file | `oneDark` from `@codemirror/theme-one-dark` (no CSS file) |
| `editor.on('change', cb)` | `EditorView.updateListener.of(u => { if (u.docChanged) … })` |
| `cm.getValue()` | `view.state.doc.toString()` |
| `cm.setValue(s)` | `view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: s } })` |
| `readOnly: true` | `EditorState.readOnly.of(true)` |
| *(nothing)* | `view.destroy()` — **required** on teardown |
| `import 'codemirror/mode/.../x'` | per-editor extension; no global registry |
| `@types/codemirror` | not needed — CM6 ships its own types |

### Two Angular-specific notes

1. **Run outside the zone.** CM6 attaches many DOM listeners. The component already injects `NgZone`
   (`custom-code.component.ts:29`) and has the call commented out at `:84`. Now is the time:

   ```ts
   this.ngZone.runOutsideAngular(() => {
     this.editor = new EditorView({ /* … */ });
   });
   ```
   Keep the `cdr.detectChanges()` inside the update listener so the error banner still updates.

2. **`.fb-drag-ignore` still matters.** `custom-code.component.html:6` puts it on the
   `<section class="expanded fb-drag-ignore">` ancestor, and `draggable.directive.ts:21` uses
   `closest()`, so editor interaction will not drag the node. No change needed.

> **UNVERIFIED:** I confirmed the CM6 package APIs, the absence of any CSS files, and the ESM
> packaging by reading the shipped `.d.ts` and `package.json` files. I did **not** build or run this
> component. Visual parity with the old `theme: 'material'` is approximate — `oneDark` is a different
> palette. If exact colours matter, write a `EditorView.theme({...})` extension instead.

### If you defer CM6

Should the CodeMirror 6 move slip, the CM5 code still needs the `require()` removed. I tested all
three candidate forms against TypeScript 6.0.3 with `module: "preserve"` and `@types/codemirror`,
calling `CodeMirror(el, opts)`:

```
import * as CodeMirror from 'codemirror';   →  ✘ TS2349: This expression is not callable.
                                                 Type 'typeof CodeMirror' has no call signatures.
import CodeMirror from 'codemirror';        →  ✅ compiles
import CodeMirror = require('codemirror');  →  ✅ compiles
```

`esModuleInterop` is effectively on under `module: "preserve"`, which is why the namespace import
loses the call signature. Use the **default import**. The original
`const CodeMirror = require('codemirror')` fails as `TS2591: Cannot find name 'require'` because the
v22 `tsconfig.app.json` sets `"types": []`. In that scenario you would also need `"codemirror"` in
`allowedCommonJsDependencies` (CM5 is UMD/CJS with no `module` or `exports` field) and would keep the
two `codemirror/*.css` entries in `angular.json`.

---

<a name="part-5"></a>
## Part 5 — Exact `package.json`

All versions below were resolved against npm and confirmed to exist.

```json
{
  "name": "@scaljeri/flow-based-demo",
  "version": "0.0.1",
  "private": false,
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "build:lib": "ng build @scaljeri/flow-based",
    "test": "ng test",
    "lint": "npm-run-all lint:*",
    "lint:ts": "ng lint",
    "lint:style": "stylelint \"src/**/*.scss\""
  },
  "dependencies": {
    "@angular/cdk": "22.1.0",
    "@angular/common": "22.1.0",
    "@angular/compiler": "22.1.0",
    "@angular/core": "22.1.0",
    "@angular/forms": "22.1.0",
    "@angular/material": "22.1.0",
    "@angular/platform-browser": "22.1.0",
    "@angular/router": "22.1.0",
    "@codemirror/lang-javascript": "6.2.5",
    "@codemirror/state": "6.7.1",
    "@codemirror/theme-one-dark": "6.1.3",
    "@codemirror/view": "6.43.7",
    "codemirror": "6.0.2",
    "google-charts": "2.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.8.1",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular/build": "22.1.0",
    "@angular/cli": "22.1.0",
    "@angular/compiler-cli": "22.1.0",
    "@angular/language-service": "22.1.0",
    "@types/node": "^22.20.1",
    "angular-eslint": "22.1.0",
    "eslint": "^9.0.0",
    "jsdom": "^28.0.0",
    "ng-packagr": "^22.0.0",
    "npm-run-all": "^4.1.5",
    "stylelint": "^16.0.0",
    "stylelint-order": "^6.0.0",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.0.0",
    "vitest": "^4.0.8"
  }
}
```

### Why each removal

| Removed | Reason |
|---|---|
| `@angular/animations` | Deprecated since 20.2; Material 22 has no animations dependency ([2.6](#26)) |
| `@angular/http` | Removed from Angular in v8; unused here |
| `@angular/platform-browser-dynamic` | `platformBrowserDynamic` deprecated → `platformBrowser` ([3.2](#32)) |
| `@ctrl/ngx-codemirror` | CM5 wrapper, already unused in every template ([Part 4](#part-4)) |
| `@ng-bootstrap/ng-bootstrap` | Zero `ngb*` usages anywhere in `src/` or `projects/` |
| `hammerjs` | Integration removed from Angular in 22.0.0 ([2.4](#24)) |
| `pepjs` | Pointer Events are natively available — **but add `touch-action: none`** ([3.1](#31)) |
| `core-js` | Reflect metadata unnecessary with Ivy AOT |
| `path-browserify` | Nothing in browser code imports `path`; no Node shimming in esbuild |
| `angular-cli-ghpages` | Re-add later if GitHub Pages deploy is still wanted (`ng deploy`) |
| `@angular-devkit/build-angular`, `@angular-devkit/build-ng-packagr` | Replaced by `@angular/build` |
| `codelyzer`, `tslint`, `rxjs-tslint-rules` | TSLint builder removed in CLI 13 → `angular-eslint` |
| `protractor`, `@types/jasminewd2`, `jasmine-spec-reporter` | Protractor builder removed in CLI 19 |
| `karma`, `karma-*`, `jasmine-core`, `@types/jasmine` | v22 defaults to vitest |
| `tsickle`, `ts-loader`, `ts-node`, `source-map-support` | Webpack/ViewEngine-era build plumbing |
| `@types/codemirror` | CM6 ships its own types |

`ng-packagr` is kept only because `projects/flow-based` is still built as a library.

> **UNVERIFIED:** `stylelint@^16` / `stylelint-order@^6` — I did not check whether
> `.stylelintrc.js` (written for stylelint 9) is compatible with stylelint 16's config format. Expect
> to migrate that config, or pin stylelint lower.

---

<a name="part-6"></a>
## Part 6 — Exact `angular.json`

Shape below matches a real `ng new` on `@angular/cli@22.1.1`, adapted to this repo's layout.

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "flow-based-demo": {
      "root": "",
      "sourceRoot": "src",
      "projectType": "application",
      "prefix": "xxl",
      "schematics": {
        "@schematics/angular:component": { "style": "scss" }
      },
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "defaultConfiguration": "production",
          "options": {
            "browser": "src/main.ts",
            "index": "src/index.html",
            "polyfills": ["zone.js"],
            "tsConfig": "src/tsconfig.app.json",
            "outputPath": "dist/flow-based-demo",
            "inlineStyleLanguage": "scss",
            "assets": [
              "src/favicon.ico",
              { "glob": "**/*", "input": "src/assets", "output": "assets" }
            ],
            "styles": ["src/styles.scss"],
            "stylePreprocessorOptions": {
              "includePaths": ["src/styles", "projects/flow-based/src/lib/"],
              "sass": {
                "silenceDeprecations": ["import", "global-builtin", "slash-div"]
              }
            },
            "allowedCommonJsDependencies": ["google-charts"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "outputHashing": "all",
              "budgets": [
                { "type": "initial", "maximumWarning": "1.5mB", "maximumError": "3mB" },
                { "type": "anyComponentStyle", "maximumWarning": "8kB", "maximumError": "16kB" }
              ]
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          }
        },
        "serve": {
          "builder": "@angular/build:dev-server",
          "defaultConfiguration": "development",
          "configurations": {
            "production": { "buildTarget": "flow-based-demo:build:production" },
            "development": { "buildTarget": "flow-based-demo:build:development" }
          }
        },
        "extract-i18n": {
          "builder": "@angular/build:extract-i18n",
          "options": { "buildTarget": "flow-based-demo:build" }
        },
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "tsConfig": "src/tsconfig.spec.json",
            "buildTarget": "flow-based-demo:build:development"
          }
        },
        "lint": {
          "builder": "@angular-eslint/builder:lint",
          "options": { "lintFilePatterns": ["src/**/*.ts", "src/**/*.html"] }
        }
      }
    },
    "@scaljeri/flow-based": {
      "root": "projects/flow-based",
      "sourceRoot": "projects/flow-based/src",
      "projectType": "library",
      "prefix": "fb",
      "architect": {
        "build": {
          "builder": "@angular/build:ng-packagr",
          "options": {
            "tsConfig": "projects/flow-based/tsconfig.lib.json",
            "project": "projects/flow-based/ng-package.json"
          },
          "configurations": {
            "production": { "project": "projects/flow-based/ng-package.prod.json" }
          }
        },
        "test": {
          "builder": "@angular/build:unit-test",
          "options": { "tsConfig": "projects/flow-based/tsconfig.spec.json" }
        },
        "lint": {
          "builder": "@angular-eslint/builder:lint",
          "options": { "lintFilePatterns": ["projects/flow-based/**/*.ts", "projects/flow-based/**/*.html"] }
        }
      }
    }
  }
}
```

### Option-by-option changes

| OLD | NEW |
|---|---|
| `"builder": "@angular-devkit/build-angular:browser"` | `"@angular/build:application"` |
| `"main": "src/main.ts"` | `"browser": "src/main.ts"` |
| `"polyfills": "src/polyfills.ts"` | `"polyfills": ["zone.js"]` |
| `"index": "src/index.html"` | ✅ unchanged (string, or `{input, output}`, or `false`) |
| `"styles"` with `indigo-pink.css` + 2 codemirror CSS | only `"src/styles.scss"` ([2.3](#23), [Part 4](#part-4)) |
| `"stylePreprocessorOptions".includePaths | ✅ unchanged — plus the new `sass.silenceDeprecations` |
| `"extractCss": true` | 🔴 **removed** — CSS is always extracted (removed in CLI 13.0.0) |
| `"buildOptimizer": true` | 🔴 **removed** — folded into `optimization` |
| `"vendorChunk": false` | 🔴 **removed** |
| `"aot": true` | ✅ still valid, default `true` — can drop it |
| `"namedChunks": false` | ✅ still valid, default `false` — can drop it |
| `"fileReplacements"` on `src/environments/*` | 🔴 **delete** — `enableProdMode()` is gone ([3.2](#32)) |
| `"defaultProject": "flow-based-demo"` | 🔴 **removed** from the workspace schema (CLI 16.0.0) |
| `src/browserslist` | 🔴 delete — never read from `src/` anyway ([3.1](#31)) |
| serve `"browserTarget"` | `"buildTarget"` |
| test `:karma` + `main`/`polyfills`/`karmaConfig` | `@angular/build:unit-test` (vitest default); delete `src/test.ts` and `src/karma.conf.js` |
| lint `:tslint` | `@angular-eslint/builder:lint` |
| e2e `:protractor` | 🔴 delete the target and `e2e/` |
| library `@angular-devkit/build-ng-packagr:build` | `@angular/build:ng-packagr` |
| — | new: `"allowedCommonJsDependencies": ["google-charts"]` |

> ⚠️ **Pin `@angular/build` ≥ 22.0.8.** Versions 22.0.0–22.0.7 shipped the *v21* browserslist baseline
> date (`2025-10-20` instead of `2026-05-07`), silently downleveling output further than documented.
> 22.1.0 is fine.

### `tsconfig.json` — root

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "sourceMap": true,
    "declaration": false,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2022",
    "module": "preserve",
    "paths": {
      "@scaljeri/flow-based": ["projects/flow-based/"]
    }
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  },
  "files": []
}
```

Changes from the current file: `target: es5` → `ES2022`; drop `module: es2015` and
`moduleResolution: node` in favour of `module: preserve`; drop `typeRoots` and `lib` (defaults
suffice); **drop `emitDecoratorMetadata`** (unnecessary with Ivy); keep `paths`. There is
deliberately **no `"strict": true`** — TypeScript 6.0 makes it the default (B6). `strictNullChecks`
likewise comes free with strict.

If the 70-site TS2564 sweep must be staged, temporarily add
`"strictPropertyInitialization": false` and `"strictTemplates": false`, then remove them.

### `src/tsconfig.app.json`

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../out-tsc/app",
    "types": []
  },
  "include": ["src/**/*.ts", "src/types/*.d.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

`src/types/*.d.ts` is where the `google-charts` shim lives ([3.2](#32)).

### `src/tsconfig.spec.json`

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../out-tsc/spec",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

---

<a name="part-7"></a>
## Part 7 — Execution order

### Strategy: rebuild, don't chain-update

`ng update` supports one major at a time, and this is **enforced in code**, not just documented:

```
if (toBeInstalledMajorVersion - currentMajorVersion > 1) {
  "Updating multiple major versions of '<name>' at once is not supported.
   Please migrate each major version individually."
  return 1;   // --force does NOT bypass this
}
```

That is **15 mandatory hops** from 7 → 22, through three major architecture walls (Ivy at 9, MDC at
15, standalone/signals at 17-19), plus Node version juggling (Angular 7-9 want Node 8/10/12; v22
wants Node 22.22.3+). For a 19-component demo app, generating a fresh v22 workspace and porting
components file by file using this document is faster and produces a cleaner result.

If you do chain-update anyway, use `--create-commits` (one commit per migration) and expect
`--force` on the 8→9 hop.

### Steps

1. **Scaffold and wire up the toolchain.**
   `ng new` a v22 workspace (or rewrite `angular.json` + `tsconfig*.json` per [Part 6](#part-6) and
   `package.json` per [Part 5](#part-5)). Node ≥22.22.3, TypeScript ~6.0.3. Delete
   `src/polyfills.ts`, `src/test.ts`, `src/karma.conf.js`, `src/browserslist`, `src/tslint.json`,
   `tslint.json`, `e2e/`, `src/environments/`.

2. **Strict-mode sweep — do this before anything else compiles.**
   Add `!` (or an initializer) at all **70 TS2564 sites** in [3.5](#35), plus the three TS7006 sites.
   Add `src/types/google-charts.d.ts`. This is the single largest mechanical edit; nothing else
   builds until it lands. Stage it with `strictPropertyInitialization: false` if you prefer.

3. **Fix the hard compile errors.**
   - Barrel imports in 3 files ([2.1](#21))
   - `entryComponents` at `src/app/app.module.ts:98-111` ([3.4](#34))
   - Duplicate `#auto` at `custom-code.component.html:10,19` → `#autoIn` / `#autoOut` (B5)
   - `src/main.ts` rewrite ([3.2](#32))
   - Remove `BrowserAnimationsModule`, `MatTooltipModule`, `CodemirrorModule` from `app.module.ts`

4. **Add `touch-action: none`** to draggable surfaces and canvases before deleting `pepjs`
   ([3.1](#31)). Test drag on a touch device — this regression is invisible on desktop.

5. **Rewrite the 4 sliders** ([2.2](#22)). They hard-crash, so they gate all downstream visual work.

6. **Stand up `mat.theme()`** in `src/styles.scss` ([2.3](#23)) and decide B1: either
   `mat.color-variants-backwards-compatibility($theme)` or drop `color=` and use tokens +
   `matButton="filled|outlined|…"`. Fix `color="secondary"` → `"primary"` at
   `component-selection.component.html:1`. Everything visual downstream depends on this choice.

7. **Add `<mat-label>` to the 5 placeholder-only form fields** (B2, [2.6](#26)) and set
   `MAT_FORM_FIELD_DEFAULT_OPTIONS` to `{appearance: 'outline'}`.

8. **Rebuild `edit-node.component.html`** without `<mat-list>`/`<mat-list-item>` (B4, [2.6](#26));
   delete the 6 `matLine` attributes and the `mat-label` rule at `edit-node.component.scss:34`.

9. **Fix the two dialog rules** at `src/styles/_index.scss:17,25` ([2.5](#25)).

10. **Card pass** — wrap the 5 bare `<mat-card-title>`s in `<mat-card-header>`; re-check the 9
    `mat-card` / `mat-card-content` SCSS rules in [1c](#1c) rows 5-15.

11. **CodeMirror 6** ([Part 4](#part-4)) — rewrite `custom-code.component.ts`, delete the two
    `codemirror/*.css` entries from `angular.json`, drop `@ctrl/ngx-codemirror` and
    `@types/codemirror`.

12. **Sass hygiene** ([3.3](#33)) — ship with `silenceDeprecations`, then migrate `@import` → `@use`
    with `sass-migrator` and `/` → `math.div` at leisure. `slash-div` has the nearer deadline.

13. **Tests** — delete the 15 scaffolded specs, or migrate `async` → `waitForAsync` and add real
    providers ([3.4](#34)).

14. **Visual QA pass** against all 21 rows of [1c](#1c), all 5 toolbars, all 14 buttons, all 10
    cards, all 6 form fields, all 4 sliders, both lists, and the dialog.

15. **Optional modernization** — `matButton="outlined"` / `matFab` / `matMiniFab`; standalone
    components (`ng g @angular/core:standalone`); `@if`/`@for`
    (`ng g @angular/core:control-flow`); `inject()` (`ng g @angular/core:inject`); signal queries
    (`ng g @angular/core:signal-queries`).

Two automatic v22 `ng update` migrations worth knowing about if you *do* chain-update, because they
change semantics: **`change-detection-eager`** (stamps `ChangeDetectionStrategy.Eager` onto all
components to preserve pre-OnPush behaviour) and **`strict-templates-default`** (writes
`strictTemplates: false`).

---

<a name="part-8"></a>
## Part 8 — UNVERIFIED items

Everything not listed here was verified against shipped packages, a real compile, or official
tagged sources.

1. **Duplicate `#auto` (B5).** I confirmed the duplicate exists at
   `custom-code.component.html:10` and `:19`. I did **not** compile it against ngtsc 22 to confirm
   the exact diagnostic. High confidence it is a hard error under Ivy; fix it regardless, since the
   second autocomplete is currently unreachable.

2. **`mat.color-variants-backwards-compatibility()`** — confirmed to exist and be exported, and
   `mat.theme()` confirmed to compile. **Not** confirmed to fully restore this app's specific toolbar
   and button colours, nor the exact `$theme` argument it expects alongside the inline-map form of
   `mat.theme()`. Verify visually before considering B1 closed.

3. **CodeMirror 6 visual parity.** Package APIs, the absence of CSS files, and ESM packaging were all
   verified by reading shipped `.d.ts` and `package.json` files. The component was **not** built or
   run. `oneDark` is a different palette from CM5's `material` theme; use a custom
   `EditorView.theme({...})` if exact colours matter.

4. **`mat-card-title` display mode.** Confirmed `.mat-mdc-card-title` has only
   `line-height: normal` and no padding. Did **not** confirm whether it resolves to `display: inline`
   (unknown-element default) or something set by the typography theme. The padding finding stands;
   verify the block/inline behaviour visually.

5. **`matButton` timeline.** Zero changelog hits for the introduction of `matButton` or a formal
   deprecation of `mat-button`. Established fact only: all old attribute selectors are present and
   functional in 22.1.0, with no `@deprecated` tags, and `button.md` documents only the new forms.
   Treat any removal date as unknown.

6. **`OVERLAY_DEFAULT_CONFIG.usePopover`.** CDK 22 adds a native-popover overlay path with a new
   `.cdk-overlay-popover` class. I did not determine whether it defaults on, nor whether Material's
   dialog/select opt in. This app positions overlays manually
   (`src/app/app.component.ts:54-66`), so verify overlay positioning visually.

7. **`stylelint@^16` / `stylelint-order@^6` compatibility** with the existing `.stylelintrc.js`
   (written for stylelint 9). Expect a config migration, or pin stylelint lower.

8. **`pepjs` removal.** No official Angular statement names `pepjs`. "Not needed" is inferred from
   Angular 22's Baseline (2026-05-07 ⇒ roughly Chrome/Edge 119+, Firefox 119+, Safari 17+), where
   Pointer Events are universally supported. The adjacent fact — Hammer.js integration removed in
   v22 — *is* officially documented. The `touch-action` warning in [3.1](#31) is the real risk here.

9. **`core-js/es7/reflect` removal version.** No changelog line states "core-js removed from
   polyfills". It is implicit in CLI 15 deleting `polyfills.ts` wholesale, plus Ivy/AOT not needing
   `reflect-metadata`.

10. **Exact per-browser minimums for v22.** Angular publishes only the Baseline date. The
    Chrome 119 / Firefox 119 / Safari 17 figures are computed from Angular's own browserslist query
    and drift as caniuse data updates.

11. **`@angular/animations` removal in v23.** Stated only in a `@deprecated` JSDoc tag ("Intent to
    remove in v23"), not in official prose or a changelog.

12. **Stale annotation in shipped Material code:** `core/_core.scss` says `core()` "is going to be
    removed in v21", yet it still ships in 22.1.0. Its actual removal version is unknown. It is a
    no-op either way.

13. **`mat-border-variant`** appears in the official `guides/theming.md` but does not exist in
    `core/tokens/_classes.scss` at 22.1.0. Only `.mat-border` and `.mat-border-subtle` are real.

14. **Removal majors for `entryComponents` / `ComponentFactoryResolver` / `async()`** are sourced
    from the official update-guide recommendations. I independently proved these symbols are
    **absent** from `@angular/core@22.1.0`'s typings (a stronger claim), but did not cross-check each
    stated major against its own release changelog.

15. **`@angular/build:unit-test`'s `[EXPERIMENTAL]` label** still appears in the shipped 22.1.0
    `builders.json` even though `ng new` generates it by default. Whether that label is intentional
    is unknown; the builder itself works.

16. **Out of scope, noted:** `projects/flow-based/src/test.ts:3` also imports
    `core-js/es7/reflect`, and the library's 4 SCSS files use `@import` with the same
    slash-division and global-builtin patterns. The library is Material-free as stated, but shares
    the toolchain and needs the same Sass, polyfill, and strict-mode treatment.
