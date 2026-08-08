import { FbModule } from '@scaljeri/flow-based';
import { fbArray, fbNumber, fbObject, fbString } from '@scaljeri/flow-based-core';
import { PlotWorker } from './plot.worker';
import { PlotSmallComponent } from './plot-small.component';
import { PlotNormalComponent } from './plot-normal.component';
import { PlotFullComponent } from './plot-full.component';
import { PlotSettingsComponent } from './plot-settings.component';
import { PlaneSmallComponent } from './plane-small.component';
import { PlaneNormalComponent } from './plane-normal.component';
import { PlaneFullComponent } from './plane-full.component';
import { MapWorker } from './map.worker';
import { MapSmallComponent } from './map-small.component';
import { MapNormalComponent } from './map-normal.component';
import { MapFullComponent } from './map-full.component';
import { PlacesWorker } from './places.worker';
import { PlacesSmallComponent } from './places-small.component';
import { PlacesSettingsComponent } from './places-settings.component';
import { MapSettingsComponent } from './map-settings.component';
import { FieldPlotWorker } from './field.worker';
import { FieldSmallComponent } from './field-small.component';
import { FieldNormalComponent } from './field-normal.component';
import { FieldFullComponent } from './field-full.component';
import { FieldSettingsComponent } from './field-settings.component';
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
    /*
     * A value per cell over a rectangle of the PLANE. Structurally the same as
     * `grid` and semantically not: a rectangle of latitudes is not a rectangle
     * of the plane, and a flow that could wire one into the other would
     * happily draw a fractal off the coast of Norway.
     */
    {
      name: 'field',
      description: 'A value per cell over a rectangle: {field: {rows, cols, values, x, y}}',
      color: '#b07fd8',
      shape: fbObject({
        field: fbObject({
          rows: fbNumber, cols: fbNumber, values: fbArray(fbNumber),
          x: fbObject({ min: fbNumber, max: fbNumber }),
          y: fbObject({ min: fbNumber, max: fbNumber }),
        }),
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
    /*
     * A cartesian plot: values against one horizontal parameter.
     *
     * Called "Time series" until the survey of what it actually draws: time
     * is one thing an x-axis can carry, and this one has always also drawn
     * f(x) sampled over a range and a composition per step. A name that
     * describes the data it happened to be built for is a name that makes a
     * reader look elsewhere for the plot they want.
     */
    'graph-plot': {
      component: {
        small: PlotSmallComponent,
        normal: PlotNormalComponent,
        full: PlotFullComponent,
      },
      settingsComponent: PlotSettingsComponent,
      settings: {
        title: 'Plot',
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
      worker: PlotWorker,
    },

    /*
     * The same data, drawn as a place rather than as a history: the second
     * and third numbers of a point against each other, with the first — time,
     * or whatever the sweep was over — forgotten on purpose.
     *
     * Called "Complex plane", which named the ONE thing it was first used
     * for. Nothing in here knows what a complex number is; it draws pairs.
     * What makes it a different node from the plot beside it is the
     * coordinate system: equal scale on both axes always, because a circle
     * that renders as an ellipse is a lie about the data, and axes through
     * zero rather than along the edge.
     */
    'graph-plane': {
      component: {
        small: PlaneSmallComponent,
        normal: PlaneNormalComponent,
        full: PlaneFullComponent,
      },
      settings: {
        title: 'Plane',
        group: 'Graphs',
        resizable: true,
        // Trajectories, and named positions: the same plane draws both.
        sockets: [{ type: 'in', formats: ['number', 'point', 'marks'] }],
        // One layer per input, drawn in the order the sockets are declared.
        addableSockets: 'in',
      },
      worker: PlotWorker,
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
     * A value per cell over a rectangle, coloured.
     *
     * This was half of the Mandelbrot node, which computed a field and drew it
     * in one breath — so nothing else could draw a field and nothing else
     * could feed the drawing. The computing half is a node in Mathematics now;
     * this draws whatever field arrives, from wherever.
     */
    'graph-field': {
      component: {
        small: FieldSmallComponent,
        normal: FieldNormalComponent,
        full: FieldFullComponent,
      },
      settingsComponent: FieldSettingsComponent,
      settings: {
        title: 'Field',
        group: 'Graphs',
        resizable: true,
        config: { scale: 'linear' },
        sockets: [
          { type: 'in', formats: ['field'] },
          // And out: the point that was last pressed, in the field's own
          // coordinates rather than in pixels.
          { type: 'out', format: 'complex' },
        ],
      },
      worker: FieldPlotWorker,
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
