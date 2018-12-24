import { RandomNumbersComponent } from './nodes/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_SETTINGS, RandomNumbersWorker } from './workers/random-numbers';
import { StatsComponent } from './nodes/stats/stats.component';
import { STATS_SETTINGS, StatsWorker } from './workers/stats';
import { BasicGraphComponent } from './nodes/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { MergeStreamsComponent } from './nodes/merge-streams/merge-streams.component';
import { MERGE_STREAMS_SETTINGS, MergeStreamsWorker } from './workers/merge-streams';
import { TapComponent } from './nodes/tap/tap.component';
import { TAP_SETTINGS, TapWorker } from './workers/tap';
import { DefaultFlowComponent } from './nodes/default-flow/default-flow.component';
import { CustomCodeComponent } from './nodes/custom-code/custom-code.component';
import { CUSTOM_CODE_SETTINGS, CustomCodeWorker } from './workers/custom-code';

export const FB_CONFIG = {
  'random-numbers': {component: RandomNumbersComponent, settings: RANDOM_NUMBER_SETTINGS, worker: RandomNumbersWorker},
  'stats': {component: StatsComponent, settings: STATS_SETTINGS, worker: StatsWorker},
  'basic-graph': {component: BasicGraphComponent, settings: BASIC_GRAPH_CONFIG, worker: BasicGraphWorker},
  'merge-streams': {component: MergeStreamsComponent, settings: MERGE_STREAMS_SETTINGS, worker: MergeStreamsWorker},
  'tap': {component: TapComponent, settings: TAP_SETTINGS, worker: TapWorker},
  'custom': {component: CustomCodeComponent, settings: CUSTOM_CODE_SETTINGS, worker: CustomCodeWorker},
  'flow': {component: DefaultFlowComponent, settings: {title: 'Composite Unit', isFlow: true}}
};

export const XXL_SOCKET_COLORS = {
  'number': '#025d04'
};
