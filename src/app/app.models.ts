export interface IDimensions {
  x?: number;
  y?: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width?: number;
  height?: number;
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
