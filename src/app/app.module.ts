import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { ConsoleComponent } from './units/console/console.component';
import { DefaultFlowComponent } from './default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FlowBasedModule, XXL_FLOW_TYPES, XXL_FLOW_UNIT_TYPES, XXL_WORKERS } from 'flow-based';
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
import { RandomNumbersWorker } from './workers/random-numbers';
import { ConsoleWorker } from './workers/console';

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    ConsoleComponent,
    DefaultFlowComponent,
    FlowComponent,
    DefaultFrontComponent,
    ComponentSelectionComponent
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
      provide: XXL_FLOW_UNIT_TYPES,
      useValue: {
        'random-numbers': RandomNumbersComponent,
        'console': ConsoleComponent,
        'default': DefaultFlowComponent
      }
    },
    {
      provide: XXL_FLOW_TYPES,
      useValue: {
        'default': DefaultFlowComponent
      }
    },
    {
      provide: XXL_WORKERS,
      useValue: {
        'random-numbers': RandomNumbersWorker,
        'console': ConsoleWorker
      }
    }
  ],
  entryComponents: [ComponentSelectionComponent, RandomNumbersComponent, ConsoleComponent, DefaultFlowComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
