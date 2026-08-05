import { FbModule } from '@scaljeri/flow-based';
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
  formats: [
    { name: 'number', description: 'A plain numeric value', color: '#025d04' },
    { name: 'point', description: 'A sampled coordinate: [x, y, ...]', color: '#9988cf' },
    {
      name: 'marks',
      description: 'A labelled set of complex points, with one of them current',
      color: '#d081b8',
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
        sockets: [{ type: 'in', formats: ['number', 'point'] }],
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
        sockets: [{ type: 'in', formats: ['geo'] }],
        // One layer per input, drawn in the order the sockets are declared.
        addableSockets: 'in',
      },
      worker: MapWorker,
    },
  },
};
