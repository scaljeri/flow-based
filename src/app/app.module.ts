import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TapSmallComponent } from './nodes/tap/tap-small.component';
import { TapNormalComponent } from './nodes/tap/tap-normal.component';
import { TapFullComponent } from './nodes/tap/tap-full.component';
import { DefaultFlowComponent } from './nodes/default-flow/default-flow.component';
import { FlowComponent } from './flow/flow.component';
import { FB_NODE_HELPERS, FB_SOCKET_COLORS, FbSocketColors, FlowBasedModule, FB_NODE_TYPES } from '@scaljeri/flow-based';
import { DefaultFrontComponent } from './components/default-front/default-front.component';

/*
 * The `@angular/material` barrel was removed in v9 — every symbol now comes from
 * its own entry point.
 */
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ComponentSelectionService } from './component-selection.service';
import { RandomNumbersComponent } from './nodes/random-numbers/random-numbers.component';
import { BasicGraphComponent } from './nodes/basic-graph/basic-graph.component';
import { AddSocketComponent } from './nodes/default-flow/add-socket/add-socket.component';
import { MergeStreamsComponent } from './nodes/merge-streams/merge-streams.component';
import { FB_CONFIG, FB_SOCKET_PALETTE } from './fb-settings';
import { NODE_HELPERS } from './node-helpers';
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
    RandomNumbersComponent,
    TapSmallComponent,
    TapNormalComponent,
    TapFullComponent,
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
    /*
     * BrowserAnimationsModule is gone: Material 22 no longer peer-depends on
     * @angular/animations (it animates with native CSS), and that package is
     * itself deprecated. `provideAnimationsAsync()` is deprecated too, so it is
     * not the replacement — there is simply nothing to register.
     */
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatDividerModule,
    MatMenuModule,
    MatToolbarModule,
    MatFormFieldModule,
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
    MatAutocompleteModule,
    MatSelectModule,
    /*
     * CodemirrorModule (@ctrl/ngx-codemirror) is gone with the move to
     * CodeMirror 6, which has no Angular wrapper and needs none — the editor is
     * constructed directly in CustomCodeComponent.
     */
  ],
  providers: [
    ComponentSelectionService,
    {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {hasBackdrop: true}},
    {provide: OverlayContainer, useClass: FullscreenOverlayContainer},
    {
      provide: FB_NODE_TYPES,
      useValue: FB_CONFIG
    }, {
      provide: FB_NODE_HELPERS,
      useValue: NODE_HELPERS
    }, {
      provide: FB_SOCKET_COLORS,
      useValue: FB_SOCKET_PALETTE as FbSocketColors
    }
  ],
  /*
   * `entryComponents` was removed in v16. Ivy resolves dynamically created
   * components without pre-registration, which is what the node registry
   * (FB_CONFIG -> DynamicComponentDirective) relies on.
   */
  bootstrap: [AppComponent]
})
export class AppModule {
}
