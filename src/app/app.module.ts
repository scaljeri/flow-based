import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { NgbButtonsModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RANDOM_NUMBERS_CONFIG, RandomNumbersComponent } from './components/random-numbers/random-numbers.component';
import { ConsoleComponent } from './components/console/console.component';
import { FlowBasedModule, XXL_FLOW_TYPES } from 'flow-based';
import { RandomNumberFactory } from './shared/random-numbers';

export const fbModels = {
  'random-numbers': {
    component: RandomNumbersComponent,
    configuration: RANDOM_NUMBERS_CONFIG,
    factory: RandomNumberFactory(),
    title: 'Random number generator'
  },
  console: {
    component: ConsoleComponent,
    configuration: {},
    factory: null,
    title: 'Console'
  }
};

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    ConsoleComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgbModule.forRoot(),
    NgbButtonsModule,
    FlowBasedModule
  ],
  providers: [
    {
      provide: XXL_FLOW_TYPES,
      useValue: {
        'random-numbers': RandomNumbersComponent,
        console: ConsoleComponent,
      }
    },
  ],
  entryComponents: [RandomNumbersComponent, ConsoleComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
