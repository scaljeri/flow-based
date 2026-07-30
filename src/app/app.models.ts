export interface IDimensions {
  x?: number;
  y?: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width?: number;
  height?: number;
  zoom?: number;
  /** Iteration budget handed to the fractal web worker. */
  maxIterations?: number;
}

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

export interface IZoomable {
  metadata: {
    label: string;
    dimensions: IDimensions;
  };
  imageData: ImageData;
}

export interface IWorker {
  label: string;
  defaults?: IDimensions;
  worker: Worker;
}
