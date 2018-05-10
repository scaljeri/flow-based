import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import {FlowBasedModule, XXL_FLOW_TYPES, SourceComponent} from 'flow-based';
import { ContextMenuComponent } from './context-menu/context-menu.component';


@NgModule({
  declarations: [
    AppComponent,
    ContextMenuComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    FlowBasedModule
  ],
  // providers: [
  //   {
  //     provide: XXL_FLOW_TYPES,
  //     useValue: {
  //       source: SourceComponent
  //     }
  //   }],
  entryComponents: [SourceComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
