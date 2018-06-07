import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {XXL_FLOW_TYPES} from './flow-based';
import {FlowBasedComponent} from './flow-based.component';
import {FlowBasedManagerService} from './services/flow-based-manager.service';
import {SourceComponent} from './components/source/source.component';
import {DummyComponent} from './components/dummy/dummy.component';
import {BlockComponent} from './block/block.component';
import {DraggableDirective} from './drag-drop/draggable/draggable.directive';
import {MovableDirective} from './drag-drop/movable/movable.directive';
import {MovableAreaDirective} from './drag-drop/movable-area/movable-area.directive';
import { FilterComponent } from './components/filter/filter.component';
import { SocketDirective } from './components/socket/socket.directive';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    FlowBasedComponent,
    SourceComponent,
    DummyComponent,
    BlockComponent,
    DraggableDirective,
    MovableDirective,
    MovableAreaDirective,
    FilterComponent,
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
