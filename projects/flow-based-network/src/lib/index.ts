import { FbModule } from '@scaljeri/flow-based';
import { RequestWorker } from './request.worker';
import { RequestSmallComponent } from './request-small.component';
import { RequestSettingsComponent } from './request-settings.component';

/**
 * The Network module: data that arrives on somebody else's schedule.
 *
 * What separates these from the rest of the palette is not that they touch a
 * socket — it is that they are not in charge. A formula answers when asked; a
 * request answers when the far end feels like it, or not at all, and the node
 * has to have something honest to show for both.
 */
export const NETWORK_MODULE: FbModule = {
  name: 'Network',
  prefix: 'net',

  formats: [
    /*
     * Whatever came back, parsed. Deliberately untyped: a request has no idea
     * what is on the other end, and pretending otherwise would put the lie in
     * the socket colours. Turning it into something specific is a job for
     * another node.
     */
    { name: 'data', description: 'Whatever a source returned, parsed', color: '#8f7ee6' },
  ],

  types: {
    'net-request': {
      component: { small: RequestSmallComponent },
      settingsComponent: RequestSettingsComponent,
      settings: {
        title: 'Request',
        group: 'Network',
        config: { url: '', method: 'GET', every: 0 },
        sockets: [
          // Anything at all means "ask again"; a trigger is a moment, not a
          // message, so the value is ignored.
          { type: 'in', name: 'when' },
          /*
           * Where to fetch from, when that is computed rather than typed. The
           * wire beats the field, and it is deliberately NOT written into the
           * config: a URL worked out a moment ago from somebody else's data is
           * not something the flow should claim as its own.
           */
          { type: 'in', name: 'url', format: 'string' },
          { type: 'out', format: 'data' },
        ],
      },
      worker: RequestWorker,
    },
  },
};
