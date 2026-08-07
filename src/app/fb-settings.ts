import { FbNodeTypes, nodeMount } from '@scaljeri/flow-based';
import { RandomNumbersSmallComponent } from './nodes/random-numbers/random-numbers-small.component';
import { RandomNumbersNormalComponent } from './nodes/random-numbers/random-numbers-normal.component';
import { RandomNumbersSettingsComponent } from './nodes/random-numbers/random-numbers-settings.component';
import { RANDOM_NUMBER_SETTINGS, RandomNumbersWorker } from './workers/random-numbers';
import { StatsSmallComponent } from './nodes/stats/stats-small.component';
import { StatsNormalComponent } from './nodes/stats/stats-normal.component';
import { StatsFullComponent } from './nodes/stats/stats-full.component';
import { STATS_SETTINGS, StatsWorker } from './workers/stats';
import { BasicGraphSmallComponent } from './nodes/basic-graph/basic-graph-small.component';
import { BasicGraphNormalComponent } from './nodes/basic-graph/basic-graph-normal.component';
import { BasicGraphFullComponent } from './nodes/basic-graph/basic-graph-full.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { MergeStreamsSmallComponent } from './nodes/merge-streams/merge-streams-small.component';
import { MergeStreamsNormalComponent } from './nodes/merge-streams/merge-streams-normal.component';
import { MERGE_STREAMS_SETTINGS, MergeStreamsWorker } from './workers/merge-streams';
import { TapSmallComponent } from './nodes/tap/tap-small.component';
import { TapNormalComponent } from './nodes/tap/tap-normal.component';
import { TapFullComponent } from './nodes/tap/tap-full.component';
import { TAP_SETTINGS, TapWorker } from './workers/tap';
import { METER_SETTINGS, meterNormal, meterSmall } from './nodes/meter/meter.node';
import { SubflowComponent } from './nodes/subflow/subflow.component';
import { SubflowSettingsComponent } from './nodes/subflow/subflow-settings.component';
import { CustomCodeSmallComponent } from './nodes/custom-code/custom-code-small.component';
import { CustomCodeNormalComponent } from './nodes/custom-code/custom-code-normal.component';
import { CustomCodeFullComponent } from './nodes/custom-code/custom-code-full.component';
import { CUSTOM_CODE_SETTINGS, CustomCodeWorker } from './workers/custom-code';
import { SCRIPT_SETTINGS, ScriptWorker } from './workers/script';
import { ScriptSmallComponent } from './nodes/script/script-small.component';
import { ScriptNormalComponent } from './nodes/script/script-normal.component';
import { ScriptFullComponent } from './nodes/script/script-full.component';
import { FractalSmallComponent } from './nodes/fractal/fractal-small.component';
import { FractalSettingsComponent } from './nodes/fractal/fractal-settings.component';
import { FRACTALS_SETTINGS, FractalsWorker } from './workers/fractals';
import { ZOOM_CANVAS_SETTINGS, ZoomCanvasWorker } from './workers/zoom-canvas';
import { ZoomCanvasSmallComponent } from './nodes/zoom-canvas/zoom-canvas-small.component';
import { ZoomCanvasNormalComponent } from './nodes/zoom-canvas/zoom-canvas-normal.component';
import { ZoomCanvasFullComponent } from './nodes/zoom-canvas/zoom-canvas-full.component';
import { CanvasSmallComponent } from './nodes/canvas/canvas-small.component';
import { CanvasNormalComponent } from './nodes/canvas/canvas-normal.component';
import { CanvasFullComponent } from './nodes/canvas/canvas-full.component';
import { CANVAS_SETTINGS, CanvasWorker } from './workers/canvas';

export const FB_CONFIG: FbNodeTypes = {
  /*
   * Small and normal say nearly the same thing — the number it just produced —
   * because everything a generator can be TOLD lives in its settings now, which
   * `settingsComponent` contributes to the shell's panel.
   */
  'random-numbers': {
    component: {
      small: RandomNumbersSmallComponent,
      normal: RandomNumbersNormalComponent,
    },
    settingsComponent: RandomNumbersSettingsComponent,
    settings: RANDOM_NUMBER_SETTINGS,
    worker: RandomNumbersWorker,
  },
  /*
   * A drawing per view, everywhere. What follows used to be single components
   * toggling .minified/.expanded with CSS — a fixed ~500px whatever the view,
   * which is what kept the demo off a phone.
   */
  'stats': {
    component: {
      small: StatsSmallComponent,
      normal: StatsNormalComponent,
      full: StatsFullComponent,
    },
    settings: STATS_SETTINGS,
    worker: StatsWorker,
  },
  'basic-graph': {
    component: {
      small: BasicGraphSmallComponent,
      normal: BasicGraphNormalComponent,
      full: BasicGraphFullComponent,
    },
    settings: BASIC_GRAPH_CONFIG,
    worker: BasicGraphWorker,
  },
  // No full: this node draws measured lines between its own elements, and on
  // the whole surface those became sweeps across an empty middle.
  'merge-streams': {
    component: {
      small: MergeStreamsSmallComponent,
      normal: MergeStreamsNormalComponent,
    },
    settings: MERGE_STREAMS_SETTINGS,
    worker: MergeStreamsWorker,
  },
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
  /*
   * The escape hatch: a node whose behaviour is written rather than
   * configured. Every other node answers one question well; this one answers
   * whatever you can express, in a real editor — Monaco, fetched only when a
   * script is actually opened.
   */
  'script': {
    component: {
      small: ScriptSmallComponent,
      normal: ScriptNormalComponent,
      full: ScriptFullComponent,
    },
    settings: { ...SCRIPT_SETTINGS, resizable: true },
    worker: ScriptWorker,
  },

  'custom': {
    component: {
      small: CustomCodeSmallComponent,
      normal: CustomCodeNormalComponent,
      full: CustomCodeFullComponent,
    },
    settings: CUSTOM_CODE_SETTINGS,
    worker: CustomCodeWorker,
  },
  /*
   * The select and the reset moved to the settings panel — they are
   * configuration, not content. What is left to draw is which fractal this
   * computes, and small says that; there is nothing more a bigger view could
   * add, so there isn't one.
   */
  'fractals': {
    component: {
      small: FractalSmallComponent,
    },
    settingsComponent: FractalSettingsComponent,
    settings: FRACTALS_SETTINGS,
    worker: FractalsWorker,
  },
  'zoomcanvas': {
    component: {
      small: ZoomCanvasSmallComponent,
      normal: ZoomCanvasNormalComponent,
      full: ZoomCanvasFullComponent,
    },
    settings: ZOOM_CANVAS_SETTINGS,
    worker: ZoomCanvasWorker,
  },
  'canvas': {
    component: {
      small: CanvasSmallComponent,
      normal: CanvasNormalComponent,
      full: CanvasFullComponent,
    },
    settings: CANVAS_SETTINGS,
    worker: CanvasWorker,
  },
  /*
   * A subflow: a node that is itself a flow. The type key stays `flow` because
   * it is in every saved file; only what it is CALLED changed.
   */
  /*
   * A subflow wears one of its children's faces when told which — see
   * `previewChild` and the settings below. Unchosen, it draws a small picture
   * of its own graph instead.
   */
  'flow': {
    component: SubflowComponent,
    settingsComponent: SubflowSettingsComponent,
    settings: {title: 'Subflow', isFlow: true},
  },

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
