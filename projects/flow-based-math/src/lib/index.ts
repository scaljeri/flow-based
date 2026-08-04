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
  },
};
