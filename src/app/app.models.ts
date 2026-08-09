/*
 * Minimal structural types for the parts of the `google-charts` visualization API
 * this app actually touches. The package ships no typings of its own, so these
 * describe the surface used by BasicGraphComponent and StatsComponent instead of
 * spreading `any` through both.
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

