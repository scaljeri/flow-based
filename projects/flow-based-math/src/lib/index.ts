import { FbNodeTypes } from '@scaljeri/flow-based';
import { FbModule } from '@scaljeri/flow-based';
import { OperatorWorker } from './operator.worker';
import { OperatorSmallComponent } from './operator-small.component';
import { FormulaWorker } from './formula.worker';
import { FormulaSmallComponent } from './formula-small.component';
import { FormulaSettingsComponent } from './formula-settings.component';
import { DerivativeWorker } from './derivative.worker';
import { DerivativeSmallComponent } from './derivative-small.component';
import { DerivativeSettingsComponent } from './derivative-settings.component';
import { SamplerWorker } from './sampler.worker';
import { PointsWorker } from './points.worker';
import { IterateSettingsComponent } from './iterate-settings.component';
import { IterateSmallComponent } from './iterate-small.component';
import { IterateWorker } from './iterate.worker';
import { PointsSmallComponent } from './points-small.component';
import { PointsSettingsComponent } from './points-settings.component';
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

/** An operator type is the same node three times, differing in one function. */
const operator = (
  title: string,
  symbol: string,
  operate: (a: number, b: number) => number,
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
    { name: 'complex', description: 'A complex number: {re, im}', color: '#2aa7a0' },
    {
      name: 'marks',
      description: 'A labelled set of complex points, with one of them current',
      color: '#d081b8',
    },
  ],

  types: {
    'math-add': operator('Add', '+', (a, b) => a + b),
    'math-subtract': operator('Subtract', '−', (a, b) => a - b),
    'math-multiply': operator('Multiply', '×', (a, b) => a * b),

    /*
     * A producer: it emits a FUNCTION, not numbers. Its whole configuration is
     * the formula editor in the settings panel.
     */
    'math-formula': {
      component: { small: FormulaSmallComponent },
      settingsComponent: FormulaSettingsComponent,
      settings: {
        title: 'Formula',
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

    /*
     * Values somebody chose in advance, read out one per tick.
     *
     * The random generator makes numbers out of nothing, which demonstrates a
     * stream and explains nothing. This walks a list you wrote down, and each
     * entry carries the name it goes by — which is what turns a plot into a
     * diagram: four dots mean little, four dots labelled 1, i, -1 and -i are
     * an argument.
     */
    'math-points': {
      component: { small: PointsSmallComponent },
      settingsComponent: PointsSettingsComponent,
      settings: {
        title: 'Points',
        group: GROUP,
        config: {
          points: [
            { re: 1, im: 0, label: '1' },
            { re: 0, im: 1, label: 'i' },
            { re: -1, im: 0, label: '-1' },
            { re: 0, im: -1, label: '-i' },
          ],
          interval: 900,
        },
        sockets: [{ type: 'out', format: 'marks' }],
      },
      worker: PointsWorker,
    },

    /*
     * The one node here with a memory.
     *
     * `z → z² + c` cannot be a formula, because a formula has no previous
     * value, and it cannot be a sampler, because a sampler sweeps a range
     * rather than following where it was taken. Iteration is a third thing,
     * and the Mandelbrot set is the only question it asks: for which `c` does
     * this stay put?
     */
    'math-iterate': {
      component: { small: IterateSmallComponent },
      settingsComponent: IterateSettingsComponent,
      settings: {
        title: 'Iterate z² + c',
        group: GROUP,
        config: { c: { re: -0.5, im: 0.5 }, steps: 40, escape: 2, interval: 300 },
        sockets: [
          // A c from elsewhere overrides the config's — a picture of the set
          // can then say which orbit to walk.
          { type: 'in', formats: ['complex'] },
          // The same shape a set of points travels as: the plane draws it
          // without being taught anything new.
          { type: 'out', format: 'marks' },
        ],
      },
      worker: IterateWorker,
    },
  },
};
