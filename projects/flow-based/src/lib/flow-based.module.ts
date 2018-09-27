import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { XXL_FLOW_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { FlowBasedManagerService } from './services/flow-based-manager.service';
import { SourceComponent } from './components/source/source.component';
import { DummyComponent } from './components/dummy/dummy.component';
import { DraggableDirective } from './drag-drop/draggable/draggable.directive';
import { MovableDirective } from './drag-drop/movable/movable.directive';
import { MovableAreaDirective } from './drag-drop/movable-area/movable-area.directive';
import { FilterComponent } from './components/filter/filter.component';
import { FlowUnitComponent } from './flow-unit/flow-unit.component';
import { DynamicComponentDirective } from './dynamic-component.directive';
import { AddSocketComponent } from './flow-unit/add-socket/add-socket.component';
import { ConnectionLinesComponent } from './connection-lines/connection-lines.component';
import { SocketInPipe } from './pipes/socket-in.pipe';
import { SocketOutPipe } from './pipes/socket-out.pipe';
import { SocketDirective } from './socket/socket.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  declarations: [
    DynamicComponentDirective,
    FlowBasedComponent,
    SourceComponent,
    DummyComponent,
    FlowUnitComponent,
    DraggableDirective,
    MovableDirective,
    MovableAreaDirective,
    FilterComponent,
    AddSocketComponent,
    ConnectionLinesComponent,
    SocketInPipe,
    SocketOutPipe,
    SocketDirective],
  exports: [FlowBasedComponent],
  providers: [
    FlowBasedManagerService,
    {
      provide: XXL_FLOW_TYPES,
      useValue: {
        source: DummyComponent
      },
    },
    FlowBasedManagerService],
  entryComponents: [DummyComponent, SourceComponent],
})
export class FlowBasedModule {
}
