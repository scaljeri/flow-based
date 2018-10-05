import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { ConsoleComponent } from './units/console/console.component';
import { DefaultFlowComponent } from './default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FlowBasedModule, XXL_FLOW_TYPES } from 'flow-based';
import { DefaultFrontComponent } from './components/default-front/default-front.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatButtonModule,
  MatInputModule, MatListModule, MatSliderModule, MatToolbarModule
} from '@angular/material';
import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ComponentSelectionService } from './component-selection.service';
import { RandomNumbersComponent } from './units/random-numbers/random-numbers.component';
import { RANDOM_NUMBER_CONFIR, RandomNumbersWorker } from './workers/random-numbers';
import { CONSOLE_CONFIG, ConsoleWorker } from './workers/console';
import { BasicGraphComponent } from './units/basic-graph/basic-graph.component';
import { BASIC_GRAPH_CONFIG, BasicGraphWorker } from './workers/basic-graph';

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    ConsoleComponent,
    DefaultFlowComponent,
    FlowComponent,
    DefaultFrontComponent,
    ComponentSelectionComponent,
    BasicGraphComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    MatToolbarModule,
    MatInputModule,
    MatSliderModule,
    FlowBasedModule,
    MatButtonModule,
    MatListModule,
    OverlayModule
  ],
  providers: [
    ComponentSelectionService,
    {provide: OverlayContainer, useClass: FullscreenOverlayContainer},
    {
      provide: XXL_FLOW_TYPES,
      useValue: {
        'random-numbers': {
          title: 'Random number generator',
          component: RandomNumbersComponent,
          config: RANDOM_NUMBER_CONFIR,
          worker: RandomNumbersWorker
        },
        'basic-graph': {
          title: 'Baisc Graph',
          component: BasicGraphComponent,
          config: BASIC_GRAPH_CONFIG,
          worker: BasicGraphWorker
        },
        'console': {component: ConsoleComponent, config: CONSOLE_CONFIG, title: 'Console.log', worker: ConsoleWorker},
        // 'default': { component: DefaultFlowComponent },
        'flow': {component: DefaultFlowComponent, title: 'Composite Unit', isFlow: true}
      }
    }
  ],
  entryComponents: [
    ComponentSelectionComponent,
    BasicGraphComponent,
    RandomNumbersComponent,
    ConsoleComponent,
    DefaultFlowComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
