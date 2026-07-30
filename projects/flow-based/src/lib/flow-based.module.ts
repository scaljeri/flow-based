import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { FB_NODE_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { SocketInPipe } from './pipes/socket-in.pipe';
import { SocketOutPipe } from './pipes/socket-out.pipe';

/**
 * CUSTOM_ELEMENTS_SCHEMA is here because the editor surface is a web component:
 * <fb-flow-canvas> is not an Angular component and its `editor` binding is a DOM
 * property. The schema is scoped to this module's own template, which contains
 * exactly that one element.
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  declarations: [
    FlowBasedComponent,
    SocketInPipe,
    SocketOutPipe],
  exports: [FlowBasedComponent, SocketInPipe, SocketOutPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: FB_NODE_TYPES,
      useValue: {}
    }]
})
export class FlowBasedModule {
}
