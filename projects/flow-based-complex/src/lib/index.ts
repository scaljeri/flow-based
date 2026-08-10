import { FbModule } from '@scaljeri/flow-based';
import { PointsWorker } from './points.worker';
import { PointsSmallComponent } from './points-small.component';
import { PointsSettingsComponent } from './points-settings.component';
import { IterateWorker } from './iterate.worker';
import { IterateSmallComponent } from './iterate-small.component';
import { IterateSettingsComponent } from './iterate-settings.component';
import { MandelbrotWorker } from './mandelbrot.worker';
import { MandelbrotSmallComponent } from './mandelbrot-small.component';
import { MandelbrotSettingsComponent } from './mandelbrot-settings.component';
import { ViewpointsWorker } from './viewpoints.worker';
import { ViewpointsSmallComponent } from './viewpoints-small.component';

/**
 * Complex-number dynamics: the machinery behind the imaginary-numbers
 * article, in its own lazily loaded module.
 *
 * These four types lived in the Mathematics and Graphs modules, and did not
 * belong there: `z → z² + c` is one subject's iteration, the Mandelbrot
 * field one subject's question, the named viewpoints one subject's
 * landmarks. The generic modules stay generic — this is the same rule that
 * keeps a demo's field names out of the editor, applied one level up. It is
 * also the working proof that an article's machinery can ship as a module a
 * flow asks for.
 */

const GROUP = 'Complex numbers';

export const COMPLEX_MODULE: FbModule = {
  name: 'Complex numbers',
  prefix: 'complex',

  /*
   * All four shared with Mathematics and Graphs by IDENTICAL descriptions —
   * that is how two modules speak about one thing: a region chosen here
   * reaches a computation there, and the field comes back.
   */
  formats: [
    { name: 'complex', description: 'A complex number: {re, im}', color: '#2aa7a0' },
    {
      name: 'marks',
      description: 'A labelled set of complex points, with one of them current',
      color: '#d081b8',
    },
    {
      name: 'region',
      description: 'A square of the complex plane: {re, im, span}',
      color: '#7f8fd8',
    },
    {
      name: 'field',
      description: 'A value per cell over a rectangle: {field: {rows, cols, values, x, y}}',
      color: '#b07fd8',
    },
  ],

  types: {
    /*
     * A producer walking a hand-written list of labelled complex points, one
     * per tick. The deliberate near-twin of graph-places — the same idea in
     * another coordinate system.
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

    /*
     * The same rule as Iterate, asked of a whole square at once.
     *
     * Iterate follows one `c` and shows the walk; this asks every point of a
     * rectangle how long its walk takes to escape and hands back the answers
     * as a field. It draws nothing — a field plot does that: computing where
     * the numbers are is mathematics, and colouring them is a picture.
     */
    'math-mandelbrot': {
      component: { small: MandelbrotSmallComponent },
      settingsComponent: MandelbrotSettingsComponent,
      settings: {
        title: 'Mandelbrot',
        group: GROUP,
        config: { view: { re: -0.6, im: 0, span: 3.2 }, iterations: 200, resolution: 400 },
        sockets: [
          // Where to look, when something else decides that.
          { type: 'in', formats: ['region'] },
          { type: 'out', format: 'field' },
        ],
      },
      worker: MandelbrotWorker,
    },

    /*
     * Named places in the plane, the way Places names them on the earth — and
     * a separate node for the same reason: where to look is data, and data on
     * a wire is visible without opening a panel.
     */
    'graph-viewpoints': {
      component: { small: ViewpointsSmallComponent },
      settings: {
        title: 'Viewpoints',
        group: GROUP,
        config: { which: 0 },
        sockets: [{ type: 'out', format: 'region' }],
      },
      worker: ViewpointsWorker,
    },
  },
};
