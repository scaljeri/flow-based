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
import { AggregateWorker } from './aggregate.worker';
import { ListWorker } from './list.worker';
import { ComposeWorker } from './compose.worker';
import { AggregateSmallComponent, ComposeSmallComponent, ListSmallComponent } from './data-transform-small.components';

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
        help: 'Reshapes what arrived into one thing: places for a map, points for a plot, a raster, a stack of bands, or a single value. Reads the paths you name out of a fetched file. The workhorse of turning a source into something drawable.',
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
        help: 'Builds a string from a pattern and named inputs — a URL out of a config\'s path and the pieces that fill it. A placeholder {region} is filled by the socket named \'region\'; it stays silent until every hole is filled.',
        group: 'Data',
        config: { pattern: '' },
        sockets: [
          // Named by hand, one per placeholder. A socket called `pattern`
          // carries the pattern itself.
          { type: 'in', aux: 'pattern', name: 'pattern' },
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
        help: 'Picks one option out of a list a source published, by number. The list is data, so the choices are — a document pill drives which one. 1 is the first, 0 is none.',
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
        help: 'Reads SEVERAL values out of one arrival at once — each output socket\'s NAME is the path it reads. One node instead of a fan of picks over the same file. Scalars only.',
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
     * The reshape trio the data story needs: aggregate (total per category,
     * mean per station), list (sort/first-N/pluck/length — "top 10 by value"),
     * and compose (build an object from named wires — the opposite of fields).
     */
    'data-aggregate': {
      component: { small: AggregateSmallComponent },
      settings: {
        title: 'Aggregate',
        help: 'Group a list by a key and fold each group — sum, mean, min, max or count. "Sales per region", "mean PM2.5 per station". With no key it folds the whole list to one number; with a key it emits one {key, value} row per group.',
        group: 'Data',
        config: { op: 'sum', value: '', key: '' },
        sockets: [
          { type: 'in', formats: ['data'] },
          { type: 'out', formats: ['data', 'number'] },
        ],
      },
      worker: AggregateWorker,
    },

    'data-list': {
      component: { small: ListSmallComponent },
      settings: {
        title: 'List',
        help: 'Reshape a list: sort by a field, keep the first N, pull one field out of every row (pluck), or count its length. "Top 10 by value" is sort desc then first 10.',
        group: 'Data',
        config: { op: 'sort', path: '', dir: 'asc', n: 10 },
        sockets: [
          { type: 'in', formats: ['data'] },
          { type: 'out', formats: ['data', 'number'] },
        ],
      },
      worker: ListWorker,
    },

    'data-compose': {
      component: { small: ComposeSmallComponent },
      settings: {
        title: 'Compose',
        help: 'Build an object from named wires — each input socket\'s NAME is a key (rename the socket to name it), its value the value. The opposite of Fields. Stays silent until every wire has arrived, so a half-built object never leaves.',
        group: 'Data',
        config: {},
        sockets: [
          { type: 'in', aux: 'a', name: 'a', formats: ['data', 'string', 'number'] },
          { type: 'in', aux: 'b', name: 'b', formats: ['data', 'string', 'number'] },
          { type: 'out', formats: ['data'] },
        ],
        addableSockets: 'in',
      },
      worker: ComposeWorker,
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
        help: 'Aligns two lists by a shared key — model beside measurement per station, two series on one axis. Matched rows merge, the right side annotating the left; \'left\' keeps the unmatched. Shows how many of the left found a partner.',
        group: 'Data',
        config: { pathA: '', pathB: '', how: 'inner' },
        sockets: [
          { type: 'in', aux: 'a', name: 'a', formats: ['data'] },
          { type: 'in', aux: 'b', name: 'b', formats: ['data'] },
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
        help: 'Keeps the items of a list that pass a rule, drops the rest — and states the rule rather than the answer, so it stays right when the data grows. Wire the value to test for in from elsewhere.',
        group: 'Data',
        config: { list: '', path: '', test: 'oneOf', value: '' },
        sockets: [
          { type: 'in', formats: ['data'] },
          /*
           * What to filter FOR, when that is a decision made somewhere else.
           * Named, because a socket's name is how this node tells the two
           * apart — the list arrives on the one without a name.
           */
          { type: 'in', aux: 'value', name: 'value', format: 'string' },
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
        help: 'Passes ONE of several input streams — or none. \'At most one\' made a shape in the graph rather than a discipline. None sends the empty form of whatever it carries, so downstream clears honestly.',
        group: 'Data',
        config: { which: 1 },
        sockets: [
          { type: 'in', aux: 'a', formats: ['geo', 'grid', 'point', 'number', 'data'], name: 'a' },
          { type: 'in', aux: 'b', formats: ['geo', 'grid', 'point', 'number', 'data'], name: 'b' },
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
