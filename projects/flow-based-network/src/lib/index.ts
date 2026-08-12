import { FbModule } from '@scaljeri/flow-based';
import { fbAny } from '@scaljeri/flow-based-core';
import { RequestWorker } from './request.worker';
import { RequestSmallComponent } from './request-small.component';
import { RequestSettingsComponent } from './request-settings.component';
import { WEBSOCKET_SETTINGS, WebSocketWorker } from './websocket.worker';
import { WebSocketSmallComponent } from './websocket-small.component';
import { WebSocketSettingsComponent } from './websocket-settings.component';
import { WEBTRANSPORT_SETTINGS, WebTransportWorker } from './webtransport.worker';
import { WebTransportSmallComponent } from './webtransport-small.component';
import { WebTransportSettingsComponent } from './webtransport-settings.component';
import { EVENTSOURCE_SETTINGS, EventSourceWorker } from './eventsource.worker';
import { EventSourceSmallComponent } from './eventsource-small.component';

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
    {
      name: 'data', description: 'Whatever a source returned, parsed', color: '#8f7ee6',
      // Unknown, and that is the point: pretending to know what a stranger's
      // server returns would put the lie in the socket colour.
      shape: fbAny,
    },
  ],

  types: {
    'net-request': {
      component: { small: RequestSmallComponent },
      settingsComponent: RequestSettingsComponent,
      settings: {
        title: 'Request',
        help: 'Fetches from a URL — once, or every interval, or whenever a moment arrives on \'when\'. Wire the \'url\' in to compute it from other data. What comes back travels as {meta, value}; a failure travels too, as null, so downstream clears rather than lies.',
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

    /*
     * The request's standing sibling: a connection that stays open, for data
     * that arrives on the server's schedule rather than being asked for.
     */
    'net-websocket': {
      component: { small: WebSocketSmallComponent },
      settingsComponent: WebSocketSettingsComponent,
      settings: WEBSOCKET_SETTINGS,
      worker: WebSocketWorker,
    },

    /*
     * The nearest thing to UDP a browser is allowed: WebTransport datagrams
     * over HTTP/3 — unordered, unreliable, allowed to vanish. A browser
     * without the API says so on the node instead of imitating a dead server.
     */
    'net-webtransport': {
      component: { small: WebTransportSmallComponent },
      settingsComponent: WebTransportSettingsComponent,
      settings: WEBTRANSPORT_SETTINGS,
      worker: WebTransportWorker,
    },

    /*
     * Server-Sent Events: a live HTTP stream over plain HTTP + CORS — what most
     * public "live" feeds actually push over. The only live-HTTP path before was
     * the Request node polling on a timer; this holds one connection open and
     * reconnects itself.
     */
    'net-eventsource': {
      component: { small: EventSourceSmallComponent },
      settings: EVENTSOURCE_SETTINGS,
      worker: EventSourceWorker,
    },
  },
};
