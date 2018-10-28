import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { TapComponent } from './units/tap/tap.component';
import { DefaultFlowComponent } from './units/default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FB_NODE_HELPERS, FlowBasedModule, XXL_FLOW_TYPES } from 'flow-based';
import { DefaultFrontComponent } from './components/default-front/default-front.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MAT_DIALOG_DEFAULT_OPTIONS,
  MatButtonModule, MatCardModule, MatCheckboxModule, MatDialogModule,
  MatInputModule, MatListModule, MatSliderModule, MatToolbarModule
} from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ComponentSelectionService } from './component-selection.service';
import { RandomNumbersComponent } from './units/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_CONFIG, RandomNumbersWorker } from './workers/random-numbers';
import { BasicGraphComponent } from './units/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { AddSocketComponent } from './units/default-flow/add-socket/add-socket.component';
import { StatsComponent } from './units/stats/stats.component';
import { STATS_CONFIG, StatsWorker } from './workers/stats';
import { MERGE_STREAMS_CONFIG, MergeStreamsWorker } from './workers/merge-streams';
import { MergeStreamsComponent } from './units/merge-streams/merge-streams.component';
import { EditSocketComponent } from './units/default-flow/edit-socket/edit-socket.component';
import { TAP_CONFIG, TapWorker } from './workers/tap';
import { FB_CONFIG } from './fb-config';
import { NODE_HELPERS } from './node-helpers';

@NgModule({
  declarations: [
    AppComponent,
    AddSocketComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    TapComponent,
    DefaultFlowComponent,
    FlowComponent,
    DefaultFrontComponent,
    ComponentSelectionComponent,
    BasicGraphComponent,
    StatsComponent,
    MergeStreamsComponent,
    EditSocketComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatToolbarModule,
    MatInputModule,
    MatSliderModule,
    FlowBasedModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatListModule,
    OverlayModule
  ],
  providers: [
    ComponentSelectionService,
    {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {hasBackdrop: true}},
    {provide: OverlayContainer, useClass: FullscreenOverlayContainer},
    {
      provide: XXL_FLOW_TYPES,
      useValue: FB_CONFIG
    }, {
      provide: FB_NODE_HELPERS,
      useValue: NODE_HELPERS
    }
  ],
  entryComponents: [
    AddSocketComponent,
    EditSocketComponent,
    ComponentSelectionComponent,
    BasicGraphComponent,
    RandomNumbersComponent,
    TapComponent,
    DefaultFlowComponent,
    MergeStreamsComponent,
    StatsComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
