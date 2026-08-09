import { FbNodeTypes } from '@scaljeri/flow-based';
import { BASICS_TYPES } from '@scaljeri/flow-based-basics';

/*
 * The demo's node registry: the standard palette, and nothing of the app's
 * own. Every generic type lives in @scaljeri/flow-based-basics — this file
 * shrank from four hundred lines the day that package was born (2026-08-10),
 * because everything in it turned out to be something any host would want.
 * The lazily loaded modules (math, graphs, network, data) join through
 * ModulesService, not here.
 */
export const FB_CONFIG: FbNodeTypes = {
  ...BASICS_TYPES,
};

export const FB_SOCKET_PALETTE = {
  'number': '#025d04',
  'point': '#9988cf'
};
