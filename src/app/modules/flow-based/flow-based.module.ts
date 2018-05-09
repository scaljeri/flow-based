import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XXL_FLOW_TYPES } from './flow-based';
import { FlowBasedComponent } from './flow-based.component';
import { FlowBasedService } from './flow-based.service';
import { SourceComponent } from './components/source/source.component';
import { DummyComponent } from './components/dummy/dummy.component';
import { BlockComponent } from './block/block.component';
import { DraggableDirective } from './block/draggable/draggable.directive';
import { MovableDirective } from './block/movable/movable.directive';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [FlowBasedComponent, SourceComponent, DummyComponent, BlockComponent, DraggableDirective, MovableDirective],
  exports: [FlowBasedComponent],
  providers: [
    {
      provide: XXL_FLOW_TYPES,
      useValue: {
        source: DummyComponent
      }
    },
    FlowBasedService],
    entryComponents: [DummyComponent, SourceComponent],

})

export class FlowBasedModule {
}
