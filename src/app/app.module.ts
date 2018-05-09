import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { SourceComponent } from './modules/flow-based/components/source/source.component';
import { XXL_FLOW_TYPES } from './modules/flow-based/flow-based';
import { FlowBasedModule } from './modules/flow-based/flow-based.module';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    FlowBasedModule
  ],
  providers: [
    {
      provide: XXL_FLOW_TYPES,
      useValue: {
        source: SourceComponent
      }
    }],
  //entryComponents: [SourceComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
