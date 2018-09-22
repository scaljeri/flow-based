import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { NgbButtonsModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RandomNumbersComponent } from './units/random-numbers/random-numbers.component';
import { ConsoleComponent } from './units/console/console.component';
import { DefaultFlowComponent } from './default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FlowBasedModule, XXL_FLOW_TYPES, XXL_FLOW_UNIT_TYPES } from 'flow-based';
import { DefaultFrontComponent } from './components/default-front/default-front.component';

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    ConsoleComponent,
    DefaultFlowComponent,
    FlowComponent,
    DefaultFrontComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule.forRoot(),
    NgbButtonsModule,
    FlowBasedModule
  ],
  providers: [
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
    }
  ],
  entryComponents: [RandomNumbersComponent, ConsoleComponent, DefaultFlowComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
