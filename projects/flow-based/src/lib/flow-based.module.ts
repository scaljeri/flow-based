import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { XXL_FLOW_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { FlowBasedManagerService } from './services/flow-based-manager.service';
import { DraggableDirective } from './drag-drop/draggable/draggable.directive';
import { MovableDirective } from './drag-drop/movable/movable.directive';
import { MovableAreaDirective } from './drag-drop/movable-area/movable-area.directive';
import { FlowUnitComponent } from './flow-unit/flow-unit.component';
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
    FlowUnitComponent,
    DraggableDirective,
    MovableDirective,
    MovableAreaDirective,
    ConnectionLinesComponent,
    SocketInPipe,
    SocketOutPipe,
    SocketComponent],
  exports: [FlowBasedComponent, SocketInPipe],
  providers: [
    FlowBasedManagerService,
    {
      provide: XXL_FLOW_TYPES,
      useValue: {}
    },
    FlowBasedManagerService]
})
export class FlowBasedModule {
}
