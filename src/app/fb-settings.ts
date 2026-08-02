import { FbNodeTypes, nodeMount } from '@scaljeri/flow-based';
import { RandomNumbersComponent } from './nodes/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_SETTINGS, RandomNumbersWorker } from './workers/random-numbers';
import { StatsComponent } from './nodes/stats/stats.component';
import { STATS_SETTINGS, StatsWorker } from './workers/stats';
import { BasicGraphComponent } from './nodes/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { MergeStreamsComponent } from './nodes/merge-streams/merge-streams.component';
import { MERGE_STREAMS_SETTINGS, MergeStreamsWorker } from './workers/merge-streams';
import { TapSmallComponent } from './nodes/tap/tap-small.component';
import { TapNormalComponent } from './nodes/tap/tap-normal.component';
import { TapFullComponent } from './nodes/tap/tap-full.component';
import { TAP_SETTINGS, TapWorker } from './workers/tap';
import { METER_SETTINGS, meterNormal, meterSmall } from './nodes/meter/meter.node';
import { DefaultFlowComponent } from './nodes/default-flow/default-flow.component';
import { CustomCodeComponent } from './nodes/custom-code/custom-code.component';
import { CUSTOM_CODE_SETTINGS, CustomCodeWorker } from './workers/custom-code';
import { FractalComponent } from './nodes/fractal/fractal.component';
import { FRACTALS_SETTINGS, FractalsWorker } from './workers/fractals';
import { ZOOM_CANVAS_SETTINGS, ZoomCanvasWorker } from './workers/zoom-canvas';
import { ZoomCanvasComponent } from './nodes/zoom-canvas/zoom-canvas.component';
import { CanvasComponent } from './nodes/canvas/canvas.component';
import { CANVAS_SETTINGS, CanvasWorker } from './workers/canvas';

export const FB_CONFIG: FbNodeTypes = {
  'random-numbers': {component: RandomNumbersComponent, settings: RANDOM_NUMBER_SETTINGS, worker: RandomNumbersWorker},
  'stats': {component: StatsComponent, settings: STATS_SETTINGS, worker: StatsWorker},
  'basic-graph': {component: BasicGraphComponent, settings: BASIC_GRAPH_CONFIG, worker: BasicGraphWorker},
  'merge-streams': {component: MergeStreamsComponent, settings: MERGE_STREAMS_SETTINGS, worker: MergeStreamsWorker},
  /*
   * A drawing PER VIEW rather than one that branches on how open it is.
   *
   * The three used to be one component whose template held a `.minified` and an
   * `.expanded` section, both in the DOM at all times with one hidden by CSS.
   * Each of these draws one thing and sizes itself to it, and the shell mounts
   * exactly the one the current view names.
   */
  'tap': {
    component: {
      small: TapSmallComponent,
      normal: TapNormalComponent,
      full: TapFullComponent,
    },
    settings: TAP_SETTINGS,
    worker: TapWorker,
  },
  'custom': {component: CustomCodeComponent, settings: CUSTOM_CODE_SETTINGS, worker: CustomCodeWorker},
  'fractals': {component: FractalComponent, settings: FRACTALS_SETTINGS, worker: FractalsWorker},
  'zoomcanvas': {component: ZoomCanvasComponent, settings: ZOOM_CANVAS_SETTINGS, worker: ZoomCanvasWorker},
  'canvas': {component: CanvasComponent, settings: CANVAS_SETTINGS, worker: CanvasWorker},
  'flow': {component: DefaultFlowComponent, settings: {title: 'Composite Unit', isFlow: true}},

  /*
   * A node type with no framework in it — plain DOM against FbNodeApi, sitting
   * in the same registry as the Angular ones. See docs/NODE-AUTHORING.md.
   */
  'meter': {
    /*
     * Two drawings, and no `full`. A meter is a reading against a range; there
     * is nothing it could do with the whole surface that it does not already do
     * in a hundred pixels, and the missing entry is how it says so — the header
     * offers no button to a view with nothing to draw.
     */
    component: {
      small: nodeMount(meterSmall),
      normal: nodeMount(meterNormal),
    },
    settings: METER_SETTINGS,
    worker: TapWorker,
  }
};

export const FB_SOCKET_PALETTE = {
  'number': '#025d04',
  'worker': '#c1a',
  'dimension': '#bebebe',
  'point': '#9988cf'
};
