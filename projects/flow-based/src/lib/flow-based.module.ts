import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { SocketDirective } from './components/socket/socket.directive';
import { XxlFlowBasedService } from './flow-based.service';
import { FlowUnitComponent } from './flow-unit/flow-unit.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule
  ],
  declarations: [
    FlowBasedComponent,
    SourceComponent,
    DummyComponent,
    FlowUnitComponent,
    DraggableDirective,
    MovableDirective,
    MovableAreaDirective,
    FilterComponent,
    SocketDirective],
  exports: [FlowBasedComponent],
  providers: [
    XxlFlowBasedService,
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
