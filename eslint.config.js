// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/*
 * Replaces the TSLint setup (TSLint was deprecated in 2019).
 *
 * A note on severities. A clean `recommended` run against this codebase reports
 * ~160 problems, almost all from four large modernisation families rather than
 * defects. Leaving them as errors makes `ng lint` useless as a signal, and fixing
 * them all inside a toolchain migration would mean changing several variables at
 * once. So each family is downgraded to a warning and tied to the roadmap stage
 * that removes it (see docs/AUDIT.md). Rules that catch actual mistakes stay as
 * errors.
 */
module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'out-tsc/**', 'coverage/**', '.angular/**', 'test-results/**', 'playwright-report/**'],
  },
  {
    // .tsx too: one demo node type is written in React, and an unlinted file is
    // an unlinted file whatever its extension.
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // The library deliberately exposes two element prefixes (xxl-* for the
      // editor shell, fb-* for node chrome) until the Xxl -> Fb rename finishes
      // in Stage 2.
      '@angular-eslint/component-selector': 'off',
      '@angular-eslint/directive-selector': 'off',

      // Deliberate, not an oversight: FlowBasedComponent and NodeComponent are
      // mutually recursive, which NgModule scoping supports and standalone
      // components would need restructuring for. Revisit in Stage 4, when the
      // shell is rebuilt.
      '@angular-eslint/prefer-standalone': 'off',

      // Tracked debt, audit 3.9: `any` is pervasive here and removing it is the
      // typing work in Stages 2-3, not a toolchain change.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Angular 19+ prefers inject() over constructor DI. A mechanical but very
      // wide change; belongs with the Stage 3 signals rework.
      '@angular-eslint/prefer-inject': 'warn',

      // Empty ngOnInit/constructor bodies; cleaned up as components are rewritten.
      '@typescript-eslint/no-empty-function': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',

      // FbKeyValues<T> is intentionally an interface with an index signature: it
      // is part of the public API and Record<> would change the exported shape.
      '@typescript-eslint/consistent-indexed-object-style': 'off',

      /*
       * Unused *variables* stay an error — that is how dead imports get caught.
       * Unused *arguments* are not checked: implementations of FbNodeWorker must
       * match the interface arity (`setStream(stream, socket, connection)`) even
       * when a particular worker ignores some of them, and renaming them all to
       * `_x` would be churn without benefit.
       */
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'none',
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    /*
     * The core package is the framework-agnostic half: the node/connection model,
     * the engine, propagation, serialisation, the worker contract. Keeping it free
     * of Angular is what lets a Lit, React or Vue shell sit on the same engine —
     * and a boundary that is only a convention erodes. So the build enforces it.
     *
     * rxjs is deliberately allowed: the worker contract is Observable-based and
     * rxjs is not a framework.
     */
    files: ['projects/flow-based-core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@angular/*', 'lit', 'lit/*', 'lit-element', 'lit-html', 'react', 'react-dom', 'vue'],
            message:
              'The core must stay framework-agnostic. Put framework code in the shell package (projects/flow-based) instead.',
          },
          {
            group: ['@scaljeri/flow-based'],
            message:
              'The core cannot depend on the Angular package — that is the dependency it exists to invert.',
          },
        ],
      }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'warn',

      // mat-checkbox / mat-slider render their own <input>, so a <label>
      // wrapping one IS associated with a control — the rule just can't see
      // through the component boundary.
      '@angular-eslint/template/label-has-associated-control': ['error', {
        controlComponents: ['mat-checkbox', 'mat-slider', 'mat-select'],
      }],
    },
  },
);
