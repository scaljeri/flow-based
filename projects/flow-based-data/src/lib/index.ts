import { FbModule } from '@scaljeri/flow-based';
import { fbAny, fbArray, fbNumber, fbObject, fbString } from '@scaljeri/flow-based-core';
import { PickWorker } from './pick.worker';
import { PickSmallComponent } from './pick-small.component';
import { PickSettingsComponent } from './pick-settings.component';
import { SwitchWorker } from './switch.worker';
import { ChoiceWorker } from './choice.worker';
import { FilterWorker } from './filter.worker';
import { FilterSmallComponent } from './filter-small.component';
import { FilterSettingsComponent } from './filter-settings.component';
import { ChoiceSmallComponent } from './choice-small.component';
import { ChoiceSettingsComponent } from './choice-settings.component';
import { TemplateWorker } from './template.worker';
import { TemplateSmallComponent } from './template-small.component';
import { TemplateSettingsComponent } from './template-settings.component';
import { SwitchSmallComponent } from './switch-small.component';
import { SwitchSettingsComponent } from './switch-settings.component';
import { FieldsWorker } from './fields.worker';
import { FieldsSmallComponent } from './fields-small.component';
import { JoinWorker } from './join.worker';
import { JoinSmallComponent } from './join-small.component';
import { JoinSettingsComponent } from './join-settings.component';

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
  /*
   * Each with its SHAPE as well as its description. The shape is what a reader
   * is shown when they press a socket and ask what it carries — the same
   * information, written the way a programmer reads types.
   */
  formats: [
    {
      name: 'string', description: 'A piece of text', color: '#7fb069',
      shape: fbString,
    },
    {
      name: 'data', description: 'Whatever a source returned, parsed', color: '#8f7ee6',
      // Deliberately unknown: a request cannot know what is on the other end,
      // and a shape that claimed otherwise would be the lie in the socket.
      shape: fbAny,
    },
    {
      name: 'geo', description: 'A labelled place on the earth: {lat, lon}', color: '#4fa3d1',
      shape: fbObject({ places: fbArray(fbObject({ lat: fbNumber, lon: fbNumber })) }),
    },
    {
      name: 'point', description: 'A sampled coordinate: [x, y, ...]', color: '#9988cf',
      shape: fbArray(fbNumber, 2),
    },
    {
      name: 'number', description: 'A plain numeric value', color: '#025d04',
      shape: fbNumber,
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
      /*
     * Declared here because Pick BUILDS one, and a module that produces a type
     * without declaring it leaves the name to whoever happens to declare it
     * first. Graphs declares the same name with the same description, so the
     * two share it rather than one of them getting a prefix.
     */
    {
      name: 'stack',
      description: 'A composition per step: named parts and a row of amounts each',
      color: '#d18f4a',
      shape: fbObject({
        stack: fbObject({ labels: fbArray(fbString), rows: fbArray(fbArray(fbNumber)) }),
      }),
    },
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
          /*
           * Every shape this node can build, including the two it could
           * always build and never admitted: a composition and a piece of
           * text. A socket that lists fewer types than its worker emits is a
           * socket that refuses a connection its own node would have honoured.
           */
          { type: 'out', formats: ['geo', 'point', 'number', 'grid', 'stack', 'string'] },
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
     * A URL is not data and should not be typed twice. A publisher that
     * states its own paths — `data/{region}/{date}/{kind}.json` as a field in
     * a config — has said where things are, and a flow that copies that into a
     * request has forked it: the day those files move, the copy is wrong and
     * silent.
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
        // which is 1-based, 0 = none — data-switch's convention, since 2026-08-09.
        config: { list: '', label: '', value: '', as: 'text', which: 1 },
        sockets: [
          { type: 'in', formats: ['data', 'geo', 'point', 'number', 'grid'] },
          { type: 'out', format: 'string' },
        ],
        addableSockets: 'none',
      },
      worker: ChoiceWorker,
    },

    /*
     * A list, minus what you did not want. Not a Pick — that takes a part OUT
     * of something; this keeps some of a list and drops the rest. It states
     * the RULE rather than the answer, so the day a publisher adds a sixth
     * item the flow has an opinion somebody actually wrote down.
     */
    /*
     * Several values out of one arrival: the socket's NAME is the path it
     * reads, so the socket dialog is the whole configuration. The
     * multi-output form of the read-one-path pick — n scalars used to cost
     * n nodes and n wires from the same source.
     */
    'data-fields': {
      component: { small: FieldsSmallComponent },
      settings: {
        title: 'Fields',
        group: 'Data',
        config: {},
        sockets: [
          { type: 'in', formats: ['data'] },
          { type: 'out', name: 'title', formats: ['string', 'number'] },
        ],
        addableSockets: 'out',
      },
      worker: FieldsWorker,
    },

    /*
     * Two lists aligned by key — Morrison's collate. Model beside
     * measurement per station, two series on one axis: comparing starts
     * with putting the rows that belong together in one row.
     */
    'data-join': {
      component: { small: JoinSmallComponent },
      settingsComponent: JoinSettingsComponent,
      settings: {
        title: 'Join',
        group: 'Data',
        config: { pathA: '', pathB: '', how: 'inner' },
        sockets: [
          { type: 'in', name: 'a', formats: ['data'] },
          { type: 'in', name: 'b', formats: ['data'] },
          { type: 'out', format: 'data' },
        ],
      },
      worker: JoinWorker,
    },

    'data-filter': {
      component: { small: FilterSmallComponent },
      settingsComponent: FilterSettingsComponent,
      settings: {
        title: 'Filter',
        group: 'Data',
        config: { list: '', path: '', test: 'oneOf', value: '' },
        sockets: [
          { type: 'in', formats: ['data'] },
          /*
           * What to filter FOR, when that is a decision made somewhere else.
           * Named, because a socket's name is how this node tells the two
           * apart — the list arrives on the one without a name.
           */
          { type: 'in', name: 'value', format: 'string' },
          { type: 'out', format: 'data' },
        ],
        addableSockets: 'none',
      },
      worker: FilterWorker,
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
           * says so by narrowing the socket in its own saved state.
           */
          { type: 'out', formats: ['geo', 'grid', 'point', 'number', 'data'] },
        ],
        addableSockets: 'in',
      },
      worker: SwitchWorker,
    },
  },
};
