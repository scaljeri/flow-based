import { FbNodeTypes, nodeMount } from '@scaljeri/flow-based';
import { RandomNumbersSmallComponent } from './random-numbers-small.component';
import { RandomNumbersNormalComponent } from './random-numbers-normal.component';
import { RandomNumbersSettingsComponent } from './random-numbers-settings.component';
import { RANDOM_NUMBER_SETTINGS, RandomNumbersWorker } from './random-numbers.worker';
import { StatsSmallComponent } from './stats-small.component';
import { StatsNormalComponent } from './stats-normal.component';
import { StatsFullComponent } from './stats-full.component';
import { STATS_SETTINGS, StatsWorker } from './stats.worker';
import { TapSmallComponent } from './tap-small.component';
import { TapNormalComponent } from './tap-normal.component';
import { TapFullComponent } from './tap-full.component';
import { TAP_SETTINGS, TapWorker } from './tap.worker';
import { METER_SETTINGS, meterNormal, meterSmall } from './meter.node';
import { SubflowComponent } from './subflow.component';
import { SubflowSettingsComponent } from './subflow-settings.component';
import { SCRIPT_SETTINGS, ScriptWorker } from './script.worker';
import { ScriptSmallComponent } from './script-small.component';
import { ScriptNormalComponent } from './script-normal.component';
import { ScriptFullComponent } from './script-full.component';

/**
 * The standard palette: the set every editor starts with.
 *
 * A package rather than app code, because these types used to live in the
 * demo application — which meant a third user of the library got an editor
 * with no generator, no inspector and no subflow. What is generic ships;
 * what is a case stays in a flow.
 *
 * Not an FbModule: modules are lazily loaded chunks a flow asks for, and the
 * basics are the floor everything stands on. A host spreads BASICS_TYPES
 * into the registry it provides.
 */
export const BASICS_TYPES: FbNodeTypes = {
  /*
   * Small and normal say nearly the same thing — the number it just produced —
   * because everything a generator can be TOLD lives in its settings, which
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
   * A drawing per view, everywhere in this palette. These used to be single
   * components toggling .minified/.expanded with CSS — a fixed ~500px
   * whatever the view, which is what kept the demo off a phone. Each drawing
   * draws one thing and sizes itself to it, and the shell mounts exactly the
   * one the current view names.
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

  /*
   * A subflow: a node that is itself a flow. The type key stays `flow`
   * because it is in every saved file; only what it is CALLED changed. It
   * wears one of its children's faces when told which — see `previewChild`
   * and the settings panel — and draws a small picture of its own graph
   * otherwise.
   */
  'flow': {
    component: SubflowComponent,
    settingsComponent: SubflowSettingsComponent,
    settings: { title: 'Subflow', isFlow: true },
  },

  /*
   * A node type with no framework in it — plain DOM against FbNodeApi,
   * sitting in the same registry as the Angular ones. See
   * docs/NODE-AUTHORING.md.
   *
   * Two drawings, and no `full`: a meter is a reading against a range, and
   * there is nothing it could do with the whole surface that it does not
   * already do in a hundred pixels. The missing entry is how it says so.
   */
  'meter': {
    component: {
      small: nodeMount(meterSmall),
      normal: nodeMount(meterNormal),
    },
    settings: METER_SETTINGS,
    worker: TapWorker,
  },
};
