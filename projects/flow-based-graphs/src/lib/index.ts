import { FbModule } from '@scaljeri/flow-based';
import { TimeseriesWorker } from './timeseries.worker';
import { TimeseriesSmallComponent } from './timeseries-small.component';
import { TimeseriesNormalComponent } from './timeseries-normal.component';
import { TimeseriesFullComponent } from './timeseries-full.component';
import { TimeseriesSettingsComponent } from './timeseries-settings.component';

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
      },
      worker: TimeseriesWorker,
    },
  },
};
