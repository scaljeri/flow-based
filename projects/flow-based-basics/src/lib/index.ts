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
import { VALUE_SETTINGS, ValueWorker } from './value.worker';
import { ValueSmallComponent } from './value-small.component';
import { ValueSettingsComponent } from './value-settings.component';
import { CLOCK_SETTINGS, ClockWorker } from './clock.worker';
import { TRIGGER_SETTINGS, TriggerWorker } from './trigger.worker';
import { GATE_SETTINGS, GateWorker } from './gate.worker';
import { ClockSmallComponent, GateSmallComponent, TriggerSmallComponent } from './moment-small.components';
import { ClockSettingsComponent, TriggerSettingsComponent } from './moment-settings.components';
import { ACCUMULATOR_SETTINGS, AccumulatorWorker, DELAY_SETTINGS, DelayWorker, HOLD_SETTINGS, HoldWorker } from './state.workers';
import { AccumulatorSmallComponent, DelaySmallComponent, HoldSmallComponent } from './state-small.components';
import { FlowParamSettingsComponent } from './flow-param-settings.component';
import { COMPARE_SETTINGS, CompareWorker } from './compare.worker';
import { LOGIC_SETTINGS, LogicWorker } from './logic.worker';
import { CompareSmallComponent, LogicSmallComponent } from './condition-small.components';
import { CONVERT_SETTINGS, ConvertWorker } from './convert.worker';
import { ConvertSmallComponent } from './convert-small.component';
import { TIMESTAMP_SETTINGS, TimestampWorker } from './timestamp.worker';
import { WINDOW_SETTINGS, WindowWorker } from './window.worker';
import { DEFER_SETTINGS, DeferWorker } from './defer.worker';
import { DeferSmallComponent, TimestampSmallComponent, WindowSmallComponent } from './utility-small.components';
import { OperatorWorker, SumWorker } from './operator.worker';
import { OperatorSmallComponent } from './operator-small.component';
import { RangeWorker } from './range.worker';
import { RangeSmallComponent } from './range-small.component';
import { RangeSettingsComponent } from './range-settings.component';
import { REROUTE_SETTINGS, RerouteWorker } from './reroute.worker';
import { RerouteSmallComponent } from './reroute-small.component';
import { FRAME_SETTINGS, FrameSettingsComponent, FrameSmallComponent, NOTE_SETTINGS, NoteSmallComponent } from './annotation.components';

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
/** A binary operator type: the same node several times, one function apart. */
const operator = (
  title: string,
  symbol: string,
  operate: (a: number, b: number) => number | undefined,
): FbNodeTypes[string] => ({
  component: { small: OperatorSmallComponent },
  settings: {
    title,
    config: { symbol },
    sockets: [
      { type: 'in', format: 'number', name: 'a' },
      { type: 'in', format: 'number', name: 'b' },
      { type: 'out', format: 'number' },
    ],
  },
  worker: class extends OperatorWorker {
    constructor() {
      super(operate);
    }
  },
});

export const BASICS_TYPES: FbNodeTypes = {
  /*
   * A constant with a handle on it: the reader's hand on the model. Small IS
   * the control — see the component. No bigger views; there is nothing more
   * to show.
   */
  'value': {
    component: { small: ValueSmallComponent },
    settingsComponent: ValueSettingsComponent,
    settings: VALUE_SETTINGS,
    worker: ValueWorker,
  },

  /*
   * The moment primitives. A moment is a PACKET on an ordinary wire (the
   * 2026-08-10 decision): clock ticks, trigger presses and gate releases all
   * travel as data, so anything with an input can be driven by any of them —
   * no second kind of connection, nothing executable travelling.
   */
  'clock': {
    component: { small: ClockSmallComponent },
    settingsComponent: ClockSettingsComponent,
    settings: CLOCK_SETTINGS,
    worker: ClockWorker,
  },

  'trigger': {
    component: { small: TriggerSmallComponent },
    settingsComponent: TriggerSettingsComponent,
    settings: TRIGGER_SETTINGS,
    worker: TriggerWorker,
  },

  'gate': {
    component: { small: GateSmallComponent },
    settings: GATE_SETTINGS,
    worker: GateWorker,
  },

  /*
   * The missing half of control: the palette's gate and on/off light CONSUME a
   * 0 or a 1, but until now nothing PRODUCED one from a condition — you reached
   * for the script node. `compare` turns two numbers and an operator into 0/1;
   * `logic` folds 0/1 signals with AND/OR/NOT. Together they are the everyday
   * "if this, then that" a flow-based editor cannot do without.
   */
  'compare': {
    component: { small: CompareSmallComponent },
    settings: COMPARE_SETTINGS,
    worker: CompareWorker,
  },

  'logic': {
    component: { small: LogicSmallComponent },
    settings: LOGIC_SETTINGS,
    worker: LogicWorker,
  },

  /*
   * A cast, made visible: to number (junk refused, not passed as a fake 0), to
   * text with optional decimals, or JSON text parsed into data.
   */
  'convert': {
    component: { small: ConvertSmallComponent },
    settings: CONVERT_SETTINGS,
    worker: ConvertWorker,
  },

  /*
   * Time, three generic things a live-data flow could not do without a script:
   * `timestamp` stamps each arrival with the wall clock; `window` is a rolling
   * mean/min/max/sum; `defer` debounces, throttles or delays a fast feed.
   */
  'timestamp': {
    component: { small: TimestampSmallComponent },
    settings: TIMESTAMP_SETTINGS,
    worker: TimestampWorker,
  },

  'window': {
    component: { small: WindowSmallComponent },
    settings: WINDOW_SETTINGS,
    worker: WindowWorker,
  },

  'defer': {
    component: { small: DeferSmallComponent },
    settings: DEFER_SETTINGS,
    worker: DeferWorker,
  },

  /*
   * Arithmetic, moved here from the math module: a fresh editor must be able to
   * add two numbers without enabling a module for a dependency (mathjs) these
   * workers never used. Add is n-ary (as many inputs as you wire); the others
   * are binary. Divide is silent at b=0 — Infinity poisons every plot
   * downstream, silence holds the last honest value.
   */
  'add': {
    component: { small: OperatorSmallComponent },
    settings: {
      title: 'Add',
      help: 'Adds its inputs — as many as you wire in. The n-ary sum, over the latest value of each.',
      config: { symbol: '+' },
      sockets: [
        { type: 'in', format: 'number' },
        { type: 'in', format: 'number' },
        { type: 'out', format: 'number' },
      ],
      addableSockets: 'in',
    },
    worker: SumWorker,
  },

  'subtract': operator('Subtract', '−', (a, b) => a - b),
  'multiply': operator('Multiply', '×', (a, b) => a * b),
  'divide': operator('Divide', '÷', (a, b) => b === 0 ? undefined : a / b),

  /* A slider's 0..100 rarely matches a formula's domain — the commonest glue. */
  'range': {
    component: { small: RangeSmallComponent },
    settingsComponent: RangeSettingsComponent,
    settings: {
      title: 'Range',
      help: 'Maps a number from one interval onto another — a slider\'s 0..100 into a plot\'s domain, a value into a colour ramp.',
      config: { fromA: 0, fromB: 1, toA: 0, toB: 100, clamp: true },
      sockets: [
        { type: 'in', format: 'number' },
        { type: 'out', format: 'number' },
      ],
    },
    worker: RangeWorker,
  },

  /*
   * The state primitives: explicit memory cells, driven by moments. Without
   * them state hides inside script nodes where a reader cannot see it.
   */
  'hold': {
    component: { small: HoldSmallComponent },
    settings: HOLD_SETTINGS,
    worker: HoldWorker,
  },

  'accumulator': {
    component: { small: AccumulatorSmallComponent },
    settings: ACCUMULATOR_SETTINGS,
    worker: AccumulatorWorker,
  },

  'unit-delay': {
    component: { small: DelaySmallComponent },
    settings: DELAY_SETTINGS,
    worker: DelayWorker,
  },

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
   * The author's margin: a note says why, a frame says what belongs
   * together — visual only, no boundary, no sockets. The flow's DOCUMENT is
   * the reader's register; these are for whoever edits the graph.
   */
  'note': {
    component: { small: NoteSmallComponent },
    settings: NOTE_SETTINGS,
  },

  /*
   * A frame is what it is: one drawing, no views to step between, no header
   * — the shell knows the type, applies its stored size in its only form,
   * and opens its config on a long press.
   */
  'frame': {
    component: { small: FrameSmallComponent },
    settingsComponent: FrameSettingsComponent,
    settings: FRAME_SETTINGS,
  },

  /*
   * A bend in a wire. Placed by double-clicking a connection — see the
   * editor's insertReroute — never really from the palette, but registered
   * like anything else so the machinery stays ordinary.
   */
  'reroute': {
    component: { small: RerouteSmallComponent },
    settings: REROUTE_SETTINGS,
    worker: RerouteWorker,
  },

  /*
   * A named value INSIDE a subflow is that subflow's parameter — Morrison's
   * IIP applied to composites. The engine routes `params.<name>` on the
   * subflow to the child with that name, the subflow's settings panel lists
   * them, and a document pill can drive `{{subflowId:params.top}}`. This is
   * what turns "four hand-edited copies of one subflow" into "four
   * instances, one value different per copy".
   */
  'flow-param': {
    component: { small: ValueSmallComponent },
    settingsComponent: FlowParamSettingsComponent,
    settings: {
      title: 'Parameter',
      help: 'A named value INSIDE a subflow — the subflow\'s knob. The container lists it as a config field, so one subflow can be reused with a different value per copy, set from the outside without opening it up. A document pill can drive it too.',
      config: { name: 'param', kind: 'number', value: 0 },
      sockets: [{ type: 'out', format: 'number' }],
    },
    worker: ValueWorker,
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
    settings: {
      title: 'Subflow',
      help: 'A graph inside a node — a flow of its own, with boundary sockets for what goes in and comes out. Fold a cluster into one box to keep the top level readable; double-click to go inside. It can wear one of its children\'s faces, or draw a small map of itself.',
      isFlow: true,
    },
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
