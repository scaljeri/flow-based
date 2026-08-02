import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { FB_NODE_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { FbNoDragDirective } from './controls/no-drag.directive';
import { FbSliderComponent } from './controls/slider.component';
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
    ReactiveFormsModule,
    /*
     * Controls a node type can use, standalone so they are equally available to
     * an app that never touches this module. Exported below, so importing
     * FlowBasedModule brings them along — a node author should not have to know
     * they are separate.
     */
    FbNoDragDirective,
    FbSliderComponent
  ],
  declarations: [
    FlowBasedComponent,
    SocketInPipe,
    SocketOutPipe],
  exports: [
    FlowBasedComponent,
    FbNoDragDirective,
    FbSliderComponent,
    SocketInPipe,
    SocketOutPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: FB_NODE_TYPES,
      useValue: {}
    }]
})
export class FlowBasedModule {
}
