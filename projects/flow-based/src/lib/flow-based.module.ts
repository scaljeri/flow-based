import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { FB_NODE_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { DraggableDirective } from './drag-drop/draggable/draggable.directive';
import { MovableDirective } from './drag-drop/movable/movable.directive';
import { MovableAreaDirective } from './drag-drop/movable-area/movable-area.directive';
import { NodeComponent } from './node/node.component';
import { DynamicComponentDirective } from './dynamic-component.directive';
import { ConnectionLinesComponent } from './connection-lines/connection-lines.component';
import { SocketInPipe } from './pipes/socket-in.pipe';
import { SocketOutPipe } from './pipes/socket-out.pipe';
import { SocketComponent } from './socket/socket.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  declarations: [
    DynamicComponentDirective,
    FlowBasedComponent,
    NodeComponent,
    DraggableDirective,
    MovableDirective,
    MovableAreaDirective,
    ConnectionLinesComponent,
    SocketInPipe,
    SocketOutPipe,
    SocketComponent],
  exports: [FlowBasedComponent, SocketInPipe, SocketOutPipe],
  providers: [
    {
      provide: FB_NODE_TYPES,
      useValue: {}
    }]
})
export class FlowBasedModule {
}
