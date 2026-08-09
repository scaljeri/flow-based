/*
 * ng-packagr compiles from the entry-point graph, and an ambient .d.ts it
 * never sees through that graph simply does not exist — the google-charts
 * declaration has to be referenced from a compiled file. A reference, not an
 * import: there is nothing to import from an ambient declaration.
 */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./google-charts.d.ts" />

/*
 * Minimal structural types for the parts of the `google-charts` visualization API
 * this app actually touches. The package ships no typings of its own, so these
 * describe the surface the stats drawings use instead of spreading `any` through them.
 */
export interface GoogleChart {
  draw(data: unknown, options: unknown): void;
}

export interface GoogleChartDataTable {
  addColumn(type: string, label: string): void;

  addRow(row: unknown[]): void;

  getNumberOfRows(): number;
}

export interface GoogleChartDataView {
  // Opaque handle: only ever passed straight back into GoogleChart.draw().
  getNumberOfRows(): number;
}

