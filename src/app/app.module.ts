import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { ConsoleComponent } from './units/console/console.component';
import { DefaultFlowComponent } from './units/default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FlowBasedModule, XXL_FLOW_TYPES } from 'flow-based';
import { DefaultFrontComponent } from './components/default-front/default-front.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MAT_DIALOG_DEFAULT_OPTIONS,
  MatButtonModule, MatCardModule, MatDialog, MatDialogModule,
  MatInputModule, MatListModule, MatSliderModule, MatToolbarModule
} from '@angular/material';
import {MatIconModule} from '@angular/material/icon';
import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ComponentSelectionService } from './component-selection.service';
import { RandomNumbersComponent } from './units/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_CONFIG, RandomNumbersWorker } from './workers/random-numbers';
import { CONSOLE_CONFIG, ConsoleWorker } from './workers/console';
import { BasicGraphComponent } from './units/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';
import { AddSocketComponent } from './units/default-flow/add-socket/add-socket.component';
import { StatsComponent } from './units/stats/stats.component';
import { STATS_CONFIG, StatsWorker } from './workers/stats';

@NgModule({
  declarations: [
    AppComponent,
    AddSocketComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    ConsoleComponent,
    DefaultFlowComponent,
    FlowComponent,
    DefaultFrontComponent,
    ComponentSelectionComponent,
    BasicGraphComponent,
    StatsComponent
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
      useValue: {
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
          title: 'Baisc Graph',
          component: BasicGraphComponent,
          config: BASIC_GRAPH_CONFIG,
          worker: BasicGraphWorker
        },
        'console': {component: ConsoleComponent, config: CONSOLE_CONFIG, title: 'Log', worker: ConsoleWorker},
        // 'default': { component: DefaultFlowComponent },
        'flow': {component: DefaultFlowComponent, title: 'Composite Unit', isFlow: true}
      }
    }
  ],
  entryComponents: [
    AddSocketComponent,
    ComponentSelectionComponent,
    BasicGraphComponent,
    RandomNumbersComponent,
    ConsoleComponent,
    DefaultFlowComponent,
    StatsComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
