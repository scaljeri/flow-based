import { RandomNumbersComponent } from './nodes/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_SETTINGS, RandomNumbersWorker } from './workers/random-numbers';
import { StatsComponent } from './nodes/stats/stats.component';
import { STATS_SETTINGS, StatsWorker } from './workers/stats';
import { BasicGraphComponent } from './nodes/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { MergeStreamsComponent } from './nodes/merge-streams/merge-streams.component';
import { MERGE_STREAMS_SETTINGS, MergeStreamsWorker } from './workers/merge-streams';
import { TapComponent } from './nodes/tap/tap.component';
import { TAP_SETTINGS, TapWorker } from './workers/tap';
import { DefaultFlowComponent } from './nodes/default-flow/default-flow.component';
import { CustomCodeComponent } from './nodes/custom-code/custom-code.component';
import { CUSTOM_CODE_SETTINGS, CustomCodeWorker } from './workers/custom-code';
import { FractalComponent } from './nodes/fractal/fractal.component';
import { FRACTALS_SETTINGS, FractalsWorker } from './workers/fractals';
import { ZOOM_CANVAS_SETTINGS, ZoomCanvasWorker } from './workers/zoom-canvas';
import { ZoomCanvasComponent } from './nodes/zoom-canvas/zoom-canvas.component';
import { CanvasComponent } from './nodes/canvas/canvas.component';
import { CANVAS_SETTINGS, CanvasWorker } from './workers/canvas';

export const FB_CONFIG = {
  'random-numbers': {component: RandomNumbersComponent, settings: RANDOM_NUMBER_SETTINGS, worker: RandomNumbersWorker},
  'stats': {component: StatsComponent, settings: STATS_SETTINGS, worker: StatsWorker},
  'basic-graph': {component: BasicGraphComponent, settings: BASIC_GRAPH_CONFIG, worker: BasicGraphWorker},
  'merge-streams': {component: MergeStreamsComponent, settings: MERGE_STREAMS_SETTINGS, worker: MergeStreamsWorker},
  'tap': {component: TapComponent, settings: TAP_SETTINGS, worker: TapWorker},
  'custom': {component: CustomCodeComponent, settings: CUSTOM_CODE_SETTINGS, worker: CustomCodeWorker},
  'fractals': {component: FractalComponent, settings: FRACTALS_SETTINGS, worker: FractalsWorker},
  'zoomcanvas': {component: ZoomCanvasComponent, settings: ZOOM_CANVAS_SETTINGS, worker: ZoomCanvasWorker},
  'canvas': {component: CanvasComponent, settings: CANVAS_SETTINGS, worker: CanvasWorker},
  'flow': {component: DefaultFlowComponent, settings: {title: 'Composite Unit', isFlow: true}}
};

export const PIXEL_RATIO_SCALE = window.devicePixelRatio > 1.5 ? 2 : 1;

export const XXL_SOCKET_COLORS = {
  'number': '#025d04',
  'worker': '#c1a',
  'dimension': '#bebebe',
  'point': '#9988cf'
};

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
