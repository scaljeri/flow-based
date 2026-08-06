import { FbModule } from '@scaljeri/flow-based';
import { PickWorker } from './pick.worker';
import { PickSmallComponent } from './pick-small.component';
import { PickSettingsComponent } from './pick-settings.component';
import { SwitchWorker } from './switch.worker';
import { ChoiceWorker } from './choice.worker';
import { ChoiceSmallComponent } from './choice-small.component';
import { ChoiceSettingsComponent } from './choice-settings.component';
import { TemplateWorker } from './template.worker';
import { TemplateSmallComponent } from './template-small.component';
import { TemplateSettingsComponent } from './template-settings.component';
import { SwitchSmallComponent } from './switch-small.component';
import { SwitchSettingsComponent } from './switch-settings.component';

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
    { name: 'string', description: 'A piece of text', color: '#7fb069' },
    { name: 'data', description: 'Whatever a source returned, parsed', color: '#8f7ee6' },
    { name: 'geo', description: 'A labelled place on the earth: {lat, lon}', color: '#4fa3d1' },
    { name: 'point', description: 'A sampled coordinate: [x, y, ...]', color: '#9988cf' },
    { name: 'number', description: 'A plain numeric value', color: '#025d04' },
    { name: 'grid', description: 'A regular raster of values over an area', color: '#e0a55a' },
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
          { type: 'out', formats: ['geo', 'point', 'number', 'grid'] },
        ],
      },
      worker: PickWorker,
    },

    /*
     * One of several, or none.
     *
     * A gate per input would allow every combination, including the ones a
     * flow means to rule out — and "at most one of these" is worth making
     * impossible rather than merely discouraged.
     */
    /*
     * A URL is not data and should not be typed twice. TOPAS publishes its own
     * paths — `data/{region}/grid/{date}/{pollutant}.json` is a field in its
     * config — and a flow that copies that into a request has forked it: the
     * day the publisher moves their grids, the copy is wrong and silent.
     */
    'data-template': {
      component: { small: TemplateSmallComponent },
      settingsComponent: TemplateSettingsComponent,
      settings: {
        title: 'Template',
        group: 'Data',
        config: { pattern: '' },
        sockets: [
          // Named by hand, one per placeholder. A socket called `pattern`
          // carries the pattern itself.
          { type: 'in', name: 'pattern' },
          { type: 'out', format: 'string' },
        ],
        // As many inputs as the pattern asks for; an output would have nothing
        // to be a second of.
        addableSockets: 'in',
      },
      worker: TemplateWorker,
    },

    /*
     * The Switch chooses between STREAMS; this chooses a VALUE out of a list a
     * source published. Two nodes because they are two questions — and because
     * a flow whose options were typed into a config goes stale the day the
     * publisher adds one.
     */
    'data-choice': {
      component: { small: ChoiceSmallComponent },
      settingsComponent: ChoiceSettingsComponent,
      settings: {
        title: 'Choice',
        group: 'Data',
        config: { list: '', label: '', value: '', as: 'text', which: 0 },
        sockets: [
          { type: 'in', formats: ['data', 'geo', 'point', 'number', 'grid'] },
          { type: 'out', format: 'string' },
        ],
        addableSockets: 'none',
      },
      worker: ChoiceWorker,
    },

    'data-switch': {
      component: { small: SwitchSmallComponent },
      settingsComponent: SwitchSettingsComponent,
      settings: {
        title: 'Switch',
        group: 'Data',
        config: { which: 1 },
        sockets: [
          { type: 'in', formats: ['geo', 'grid', 'point', 'number', 'data'], name: 'a' },
          { type: 'in', formats: ['geo', 'grid', 'point', 'number', 'data'], name: 'b' },
          /*
           * As broad as the inputs, because a switch cannot know what it
           * carries until something is wired into it. A flow that does know
           * says so on its own socket — see the tno fixture.
           */
          { type: 'out', formats: ['geo', 'grid', 'point', 'number', 'data'] },
        ],
        addableSockets: 'in',
      },
      worker: SwitchWorker,
    },
  },
};
