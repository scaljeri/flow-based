import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import {FlowBasedModule, XXL_FLOW_TYPES, SourceComponent} from 'flow-based';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import {NgbButtonsModule, NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {RandomNumbersComponent} from './components/random-numbers/random-numbers.component';

@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent,
    RandomNumbersComponent
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
        'random-numbers': RandomNumbersComponent
      }
    }],
  entryComponents: [RandomNumbersComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
