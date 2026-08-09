/**
 * `google-charts` ships no type declarations, which under TypeScript 6 (where
 * `strict` is on by default) is a hard TS7016 error rather than an implicit any.
 *
 * The package is a thin loader around Google's hosted Charts API: `load()` pulls
 * the remote script and invokes the callback, after which `api` is the global
 * `google` namespace. That namespace is far too large to model usefully here, so
 * it stays `any` — the surface this app touches is
 * `api.visualization.{LineChart,DataTable,DataView}`.
 */
declare module 'google-charts' {
  export const GoogleCharts: {
    load(callback?: () => void, packages?: string | string[]): void;
    api: any;
  };
}
