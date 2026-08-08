import { FbModule } from '@scaljeri/flow-based';
import { fbArray, fbNumber, fbObject, fbString } from '@scaljeri/flow-based-core';
import { TimeseriesWorker } from './timeseries.worker';
import { TimeseriesSmallComponent } from './timeseries-small.component';
import { TimeseriesNormalComponent } from './timeseries-normal.component';
import { TimeseriesFullComponent } from './timeseries-full.component';
import { TimeseriesSettingsComponent } from './timeseries-settings.component';
import { ComplexPlaneSmallComponent } from './complex-plane-small.component';
import { ComplexPlaneNormalComponent } from './complex-plane-normal.component';
import { ComplexPlaneFullComponent } from './complex-plane-full.component';
import { MapWorker } from './map.worker';
import { MapSmallComponent } from './map-small.component';
import { MapNormalComponent } from './map-normal.component';
import { MapFullComponent } from './map-full.component';
import { PlacesWorker } from './places.worker';
import { PlacesSmallComponent } from './places-small.component';
import { PlacesSettingsComponent } from './places-settings.component';
import { MapSettingsComponent } from './map-settings.component';
import { MandelbrotWorker } from './mandelbrot.worker';
import { MandelbrotSmallComponent } from './mandelbrot-small.component';
import { MandelbrotNormalComponent } from './mandelbrot-normal.component';
import { MandelbrotFullComponent } from './mandelbrot-full.component';
import { MandelbrotSettingsComponent } from './mandelbrot-settings.component';
import { ViewpointsWorker } from './viewpoints.worker';
import { ViewpointsSmallComponent } from './viewpoints-small.component';

/**
 * The Graphs module: ways of LOOKING at streams.
 *
 * Its own chunk like Mathematics, and its own group in the palette. The first
 * resident plots a stream over time; other representations of the same idea
 * will join it here rather than in the core set.
 */
export const GRAPHS_MODULE: FbModule = {
  name: 'Graphs',
  prefix: 'graph',

  // The same identities Mathematics declares, so the two SHARE these types —
  // which is what lets a sampled function flow straight into a plot.
  /*
   * With their SHAPES, which is what a reader is shown when they press a socket
   * and ask what it carries. A description says what a type means; the shape
   * says what it looks like, and a reader who has written TypeScript takes the
   * second in faster than any prose.
   */
  formats: [
    {
      name: 'number', description: 'A plain numeric value', color: '#025d04',
      shape: fbNumber,
    },
    {
      name: 'point', description: 'A sampled coordinate: [x, y, ...]', color: '#9988cf',
      // Two at least: an [x] is not a coordinate.
      shape: fbArray(fbNumber, 2),
    },
    {
      name: 'marks',
      description: 'A labelled set of complex points, with one of them current',
      color: '#d081b8',
      shape: fbObject({ marks: fbArray(fbObject({ re: fbNumber, im: fbNumber })) }),
    },
    /*
     * Deliberately not `point`. An [x, y] is a sample of a function and a
     * {lat, lon} is a place on the earth; a type system that let one stand for
     * the other would happily draw somebody's wave in the Atlantic.
     */
    {
      name: 'geo',
      description: 'A labelled place on the earth: {lat, lon}',
      color: '#4fa3d1',
      shape: fbObject({ places: fbArray(fbObject({ lat: fbNumber, lon: fbNumber })) }),
    },
    {
      name: 'complex', description: 'A complex number: {re, im}', color: '#2aa7a0',
      shape: fbObject({ re: fbNumber, im: fbNumber }),
    },
    /*
     * Where to look, not what is there. A region is not a `complex` with a
     * size bolted on: one is a point somebody means, the other is a window,
     * and wiring a window into something expecting a point would draw the
     * corner of the view as if it were a value.
     */
    {
      name: 'region',
      description: 'A square of the complex plane: {re, im, span}',
      color: '#7f8fd8',
      shape: fbObject({ re: fbNumber, im: fbNumber, span: fbNumber }),
    },
    /*
     * What a total is made of, per step. Not a `point`: a point says how much,
     * this says how much of what, and a plot handed one where it expected the
     * other would have to guess which of eighteen numbers was the y.
     */
    {
      name: 'stack',
      description: 'A composition per step: named parts and a row of amounts each',
      color: '#d18f4a',
      /*
       * `rows`, which is what travels and what the plot reads. It said
       * `values` — so a reader pressing the socket to ask what it carries was
       * shown a field that does not exist on the wire.
       */
      shape: fbObject({
        stack: fbObject({ labels: fbArray(fbString), rows: fbArray(fbArray(fbNumber)) }),
      }),
    },
    {
      name: 'grid', description: 'A regular raster of values over an area', color: '#e0a55a',
      shape: fbObject({
        grid: fbObject({
          rows: fbNumber, cols: fbNumber,
          latMin: fbNumber, latMax: fbNumber, lonMin: fbNumber, lonMax: fbNumber,
          values: fbArray(fbNumber),
        }),
      }),
    },
  ],

  types: {
    'graph-timeseries': {
      component: {
        small: TimeseriesSmallComponent,
        normal: TimeseriesNormalComponent,
        full: TimeseriesFullComponent,
      },
      settingsComponent: TimeseriesSettingsComponent,
      settings: {
        title: 'Time series',
        group: 'Graphs',
        // The normal view grows with a corner grip; the plot fills what it gets.
        resizable: true,
        config: { style: 'line' },
        // Readings over time, or sampled points — both are drawable series.
        sockets: [{ type: 'in', formats: ['number', 'point', 'stack'] }],
        /*
         * Every input is one drawn layer, so there can be as many as you like
         * — but a plot has nothing to send anywhere, and an output would be a
         * socket its worker never fills.
         */
        addableSockets: 'in',
      },
      worker: TimeseriesWorker,
    },

    /*
     * The complex plane: im against re, time as the parameter. Fed by the
     * same point stream the time series drinks — a real series lies flat on
     * the real axis, a complex one walks circles and spirals.
     */
    'graph-complex': {
      component: {
        small: ComplexPlaneSmallComponent,
        normal: ComplexPlaneNormalComponent,
        full: ComplexPlaneFullComponent,
      },
      settings: {
        title: 'Complex plane',
        group: 'Graphs',
        resizable: true,
        // Trajectories, and named positions: the same plane draws both.
        sockets: [{ type: 'in', formats: ['number', 'point', 'marks'] }],
        // One layer per input, drawn in the order the sockets are declared.
        addableSockets: 'in',
      },
      worker: TimeseriesWorker,
    },

    /*
     * A list of places somebody wrote down — the map's counterpart to the
     * Points node, and a separate type for the same reason: latitude and
     * longitude are not a real and an imaginary part.
     */
    'graph-places': {
      component: { small: PlacesSmallComponent },
      settingsComponent: PlacesSettingsComponent,
      settings: {
        title: 'Places',
        group: 'Graphs',
        config: {
          places: [
            { lat: 52.3676, lon: 4.9041, label: 'Amsterdam' },
            { lat: 51.9244, lon: 4.4777, label: 'Rotterdam' },
            { lat: 52.0705, lon: 4.3007, label: 'Den Haag' },
            { lat: 51.4416, lon: 5.4697, label: 'Eindhoven' },
          ],
          interval: 0,
        },
        sockets: [{ type: 'out', format: 'geo' }],
      },
      worker: PlacesWorker,
    },


    /*
     * The world as a drawing surface. Leaflet arrives by dynamic import when
     * a map is first drawn, so a flow of plots never fetches a mapping
     * library — the module chunk alone would have made everyone pay for it.
     */
    'graph-map': {
      component: {
        small: MapSmallComponent,
        normal: MapNormalComponent,
        full: MapFullComponent,
      },
      settingsComponent: MapSettingsComponent,
      settings: {
        title: 'Map',
        group: 'Graphs',
        resizable: true,
        config: { track: true, follow: true },
        sockets: [
          // One layer per input, drawn in the order the sockets are declared.
          { type: 'in', formats: ['geo', 'grid'] },
          // And one way out: the place that was last clicked.
          { type: 'out', format: 'geo' },
        ],
        addableSockets: 'in',
      },
      worker: MapWorker,
    },

    /*
     * One rule asked of the whole plane at once.
     *
     * Not a plot: nothing is being drawn FROM data here, the picture IS the
     * computation — every pixel iterates `z² + c` for its own `c` and is
     * coloured by whether it ran away. The node holds where to look; the view
     * recomputes at whatever size it has, a band of rows per frame.
     */
    'graph-mandelbrot': {
      component: {
        small: MandelbrotSmallComponent,
        normal: MandelbrotNormalComponent,
        full: MandelbrotFullComponent,
      },
      settingsComponent: MandelbrotSettingsComponent,
      settings: {
        title: 'Mandelbrot set',
        group: 'Graphs',
        resizable: true,
        config: { view: { re: -0.6, im: 0, span: 3.2 }, iterations: 200 },
        sockets: [
          // Where to look, when something else decides that.
          { type: 'in', formats: ['region'] },
          // And out: the point that was last pressed, for an orbit to walk.
          { type: 'out', format: 'complex' },
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
        group: 'Graphs',
        config: { which: 0 },
        sockets: [{ type: 'out', format: 'region' }],
      },
      worker: ViewpointsWorker,
    },
  },
};
