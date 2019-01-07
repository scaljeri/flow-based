import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { TapComponent } from './nodes/tap/tap.component';
import { DefaultFlowComponent } from './nodes/default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FB_NODE_HELPERS, FB_SOCKET_COLORS, FbSocketColors, XXL_FLOW_TYPES } from '../../projects/flow-based/src/lib/flow-based';
import { DefaultFrontComponent } from './components/default-front/default-front.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import {
  MAT_DIALOG_DEFAULT_OPTIONS, MatAutocompleteModule,
  MatButtonModule, MatCardModule, MatCheckboxModule, MatDialogModule,
  MatInputModule, MatListModule, MatSelectModule, MatSliderModule, MatToolbarModule
} from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ComponentSelectionService } from './component-selection.service';
import { RandomNumbersComponent } from './nodes/random-numbers/random-numbers.component';
import { BasicGraphComponent } from './nodes/basic-graph/basic-graph.component';
import { AddSocketComponent } from './nodes/default-flow/add-socket/add-socket.component';
import { MergeStreamsComponent } from './nodes/merge-streams/merge-streams.component';
import { FB_CONFIG, XXL_SOCKET_COLORS } from './fb-settings';
import { NODE_HELPERS } from './node-helpers';
import { FlowBasedModule } from '../../projects/flow-based/src/lib/flow-based.module';
import { StatsComponent } from './nodes/stats/stats.component';
import { NormalNodeComponent } from './components/normal-node/normal-node.component';
import { EditNodeComponent } from './components/edit-node/edit-node.component';
import { NodeHeaderComponent } from './components/node-header/node-header.component';
import { CustomCodeComponent } from './nodes/custom-code/custom-code.component';
import { FractalComponent } from './nodes/fractal/fractal.component';
import { ZoomCanvasComponent } from './nodes/zoom-canvas/zoom-canvas.component';
import { CanvasComponent } from './nodes/canvas/canvas.component';

@NgModule({
  declarations: [
    AppComponent,
    AddSocketComponent,
    ContextMenuComponent,
    RandomNumbersComponent,
    TapComponent,
    DefaultFlowComponent,
    FlowComponent,
    DefaultFrontComponent,
    ComponentSelectionComponent,
    BasicGraphComponent,
    MergeStreamsComponent,
    EditNodeComponent,
    NodeHeaderComponent,
    StatsComponent,
    NormalNodeComponent,
    CustomCodeComponent,
    FractalComponent,
    ZoomCanvasComponent,
    CanvasComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatToolbarModule,
    MatInputModule,
    MatSliderModule,
    FlowBasedModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    OverlayModule,
    CodemirrorModule,
    MatAutocompleteModule,
    MatSelectModule
  ],
  providers: [
    ComponentSelectionService,
    {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {hasBackdrop: true}},
    {provide: OverlayContainer, useClass: FullscreenOverlayContainer},
    {
      provide: XXL_FLOW_TYPES,
      useValue: FB_CONFIG
    }, {
      provide: FB_NODE_HELPERS,
      useValue: NODE_HELPERS
    }, {
      provide: FB_SOCKET_COLORS,
      useValue: XXL_SOCKET_COLORS as FbSocketColors
    }
  ],
  entryComponents: [
    AddSocketComponent,
    ComponentSelectionComponent,
    BasicGraphComponent,
    RandomNumbersComponent,
    TapComponent,
    DefaultFlowComponent,
    MergeStreamsComponent,
    StatsComponent,
    CustomCodeComponent,
    FractalComponent,
    CanvasComponent,
    ZoomCanvasComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
