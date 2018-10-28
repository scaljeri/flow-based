import { RandomNumbersComponent } from './units/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_CONFIG, RandomNumbersWorker } from './workers/random-numbers';
import { StatsComponent } from './units/stats/stats.component';
import { STATS_CONFIG, StatsWorker } from './workers/stats';
import { BasicGraphComponent } from './units/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { MergeStreamsComponent } from './units/merge-streams/merge-streams.component';
import { MERGE_STREAMS_CONFIG, MergeStreamsWorker } from './workers/merge-streams';
import { TapComponent } from './units/tap/tap.component';
import { TAP_CONFIG, TapWorker } from './workers/tap';
import { DefaultFlowComponent } from './units/default-flow/default-flow.component';

export const FB_CONFIG = {
  'random-numbers': {
    title: 'Random number generator',
    component: RandomNumbersComponent,
    config: RANDOM_NUMBER_CONFIG,
    worker: RandomNumbersWorker
  },
  'stats': {
    title: 'Statistics',
    component: StatsComponent,
    config: STATS_CONFIG,
    worker: StatsWorker
  },
  'basic-graph': {
    title: 'Basic Graph',
    component: BasicGraphComponent,
    config: BASIC_GRAPH_CONFIG,
    worker: BasicGraphWorker
  },
  'merge-streams': {
    title: 'Merge streams',
    component: MergeStreamsComponent,
    config: MERGE_STREAMS_CONFIG,
    worker: MergeStreamsWorker
  },
  'tap': {component: TapComponent, config: TAP_CONFIG, title: 'Tap', worker: TapWorker},
  // 'default': { component: DefaultFlowComponent },
  'flow': {component: DefaultFlowComponent, title: 'Composite Unit', isFlow: true}
};
