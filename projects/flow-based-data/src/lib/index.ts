import { FbModule } from '@scaljeri/flow-based';
import { PickWorker } from './pick.worker';
import { PickSmallComponent } from './pick-small.component';
import { PickSettingsComponent } from './pick-settings.component';

/**
 * The Data module: reshaping what flows, without writing code.
 *
 * A request cannot know what is on the other end, so it hands on whatever
 * parsed. Something has to turn that into the typed thing the next node wants,
 * and that something is a node of its own rather than a setting on the
 * fetcher — one node, one job, and the seam between them is visible on the
 * canvas instead of buried in a config panel.
 */
export const DATA_MODULE: FbModule = {
  name: 'Data',
  prefix: 'data',

  // The same identities the other modules declare, so a picked value flows
  // straight into a map or a plot.
  formats: [
    { name: 'data', description: 'Whatever a source returned, parsed', color: '#8f7ee6' },
    { name: 'geo', description: 'A labelled place on the earth: {lat, lon}', color: '#4fa3d1' },
    { name: 'point', description: 'A sampled coordinate: [x, y, ...]', color: '#9988cf' },
    { name: 'number', description: 'A plain numeric value', color: '#025d04' },
  ],

  types: {
    'data-pick': {
      component: { small: PickSmallComponent },
      settingsComponent: PickSettingsComponent,
      settings: {
        title: 'Pick',
        group: 'Data',
        config: { shape: 'geo', list: 'list', a: 'lat', b: 'lon', label: 'name', limit: 500 },
        sockets: [
          { type: 'in', format: 'data' },
          /*
           * Three formats on one socket, because what comes out is the
           * SHAPE that was chosen — and the engine's job is to say whether
           * the far end can take it, not to guess which one it will be.
           */
          { type: 'out', formats: ['geo', 'point', 'number'] },
        ],
      },
      worker: PickWorker,
    },
  },
};
