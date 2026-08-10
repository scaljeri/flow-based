import { FbNodeTypes } from '@scaljeri/flow-based';
import { FbModule } from '@scaljeri/flow-based';
import { OperatorWorker, SumWorker } from './operator.worker';
import { OperatorSmallComponent } from './operator-small.component';
import { RangeWorker } from './range.worker';
import { RangeSmallComponent } from './range-small.component';
import { RangeSettingsComponent } from './range-settings.component';
import { FormulaWorker } from './formula.worker';
import { FormulaSmallComponent } from './formula-small.component';
import { FormulaSettingsComponent } from './formula-settings.component';
import { DerivativeWorker } from './derivative.worker';
import { DerivativeSmallComponent } from './derivative-small.component';
import { DerivativeSettingsComponent } from './derivative-settings.component';
import { SamplerWorker } from './sampler.worker';
import { SamplerSmallComponent } from './sampler-small.component';
import { SamplerSettingsComponent } from './sampler-settings.component';

/**
 * The Mathematics module.
 *
 * A separate chunk on purpose: mathjs — the parser, the algebra, the
 * derivatives — is most of a megabyte, and it downloads when the module is
 * enabled rather than riding along with every editor.
 *
 * The components in here are standalone, because a lazily-loaded type cannot
 * appear in the app module's declarations without dragging the chunk back
 * into the main bundle.
 */

const GROUP = 'Mathematics';

/** An operator type is the same node several times, differing in one function. */
const operator = (
  title: string,
  symbol: string,
  operate: (a: number, b: number) => number | undefined,
): FbNodeTypes[string] => ({
  component: { small: OperatorSmallComponent },
  settings: {
    title,
    group: GROUP,
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

export const MATH_MODULE: FbModule = {
  name: 'Mathematics',
  prefix: 'math',

  /*
   * The data types this module DEFINES. The descriptions are their identity:
   * another module declaring the same name with a compatible description
   * shares the type; one describing something else gets its name prefixed.
   */
  formats: [
    { name: 'number', description: 'A plain numeric value', color: '#025d04' },
    { name: 'function', description: 'A symbolic function of x', color: '#c77d0a' },
    { name: 'point', description: 'A sampled coordinate: [x, y, ...]', color: '#9988cf' },
  ],

  types: {
    /*
     * Add is n-ary where its siblings are binary: a sum has no fixed arity,
     * and this is where merge-streams went when the two nodes answering "add
     * two streams" became one (2026-08-09). More terms are more sockets —
     * the array-port pattern the plots already use.
     */
    'math-add': {
      component: { small: OperatorSmallComponent },
      settings: {
        title: 'Add',
        help: 'Adds its inputs — as many as you wire in. The n-ary sum: two number streams or ten, over the latest value of each.',
        group: GROUP,
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
    'math-subtract': operator('Subtract', '−', (a, b) => a - b),
    'math-multiply': operator('Multiply', '×', (a, b) => a * b),
    // Divide says nothing at b = 0: Infinity on a wire poisons every plot
    // downstream, silence holds the last honest value. See OperatorWorker.
    'math-divide': operator('Divide', '÷', (a, b) => b === 0 ? undefined : a / b),

    /*
     * The commonest glue there is: a slider's 0..100 rarely matches a
     * formula's domain. See RangeWorker.
     */
    'math-range': {
      component: { small: RangeSmallComponent },
      settingsComponent: RangeSettingsComponent,
      settings: {
        title: 'Range',
        help: 'Maps a number from one interval onto another — a slider\'s 0..100 into a plot\'s domain, a value into a colour ramp. The commonest glue in a viz, without reaching for a script.',
        group: GROUP,
        config: { fromA: 0, fromB: 1, toA: 0, toB: 100, clamp: true },
        sockets: [
          { type: 'in', format: 'number' },
          { type: 'out', format: 'number' },
        ],
      },
      worker: RangeWorker,
    },

    /*
     * A producer: it emits a FUNCTION, not numbers. Its whole configuration is
     * the formula editor in the settings panel.
     */
    'math-formula': {
      component: { small: FormulaSmallComponent },
      settingsComponent: FormulaSettingsComponent,
      settings: {
        title: 'Formula',
        help: 'Writes a function of x — the orange wire carries the FUNCTION itself, expression and notation, not numbers. Free symbols become tunable parameters. A sampler turns it into points to plot.',
        group: GROUP,
        config: { expr: 'x^2' },
        sockets: [{ type: 'out', format: 'function' }],
      },
      worker: FormulaWorker,
    },

    'math-derivative': {
      component: { small: DerivativeSmallComponent },
      settingsComponent: DerivativeSettingsComponent,
      settings: {
        title: 'Derivative',
        help: 'Differentiates the incoming function symbolically: d/dx, in and out as functions. Wire a formula in, get its slope as another function.',
        group: GROUP,
        sockets: [
          { type: 'in', format: 'function' },
          { type: 'out', format: 'function' },
        ],
      },
      worker: DerivativeWorker,
    },

    /*
     * The bridge between the two vocabularies: a function has no time in it,
     * and the sampler gives it some — f(x) swept over a range, one sample per
     * tick, which is exactly what a time-series plot drinks.
     */
    'math-sampler': {
      component: { small: SamplerSmallComponent },
      settingsComponent: SamplerSettingsComponent,
      settings: {
        title: 'Sampler',
        help: 'Turns a function into data: f(x) swept over a range. \'Point\' mode walks one [x,y] per tick for an animation; \'sweep\' hands back the whole curve at once. This is what a time-series plot drinks.',
        group: GROUP,
        config: { from: 0, to: 10, step: 0.1, interval: 50, mode: 'point' },
        sockets: [
          { type: 'in', format: 'function' },
          // Points, not bare numbers: a sample without its x is half a fact.
          { type: 'out', format: 'point' },
        ],
      },
      worker: SamplerWorker,
    },

  },
};
