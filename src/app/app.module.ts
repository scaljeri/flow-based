import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TapSmallComponent } from './nodes/tap/tap-small.component';
import { TapNormalComponent } from './nodes/tap/tap-normal.component';
import { TapFullComponent } from './nodes/tap/tap-full.component';
import { SubflowComponent } from './nodes/subflow/subflow.component';
import { SubflowSettingsComponent } from './nodes/subflow/subflow-settings.component';
import { TypeColorsComponent } from './components/type-colors/type-colors.component';
import { ModulesDialogComponent } from './components/modules/modules-dialog.component';
import { FlowsDialogComponent } from './components/flows/flows-dialog.component';
import { ModulesService } from './modules.service';
import { FlowComponent } from './flow/flow.component';
import { FB_FORMAT_INFO, FB_NODE_HELPERS, FB_SOCKET_COLORS, FB_TYPE_ASSIGNABILITY, FbSocketColors, FlowBasedModule, FB_NODE_TYPES } from '@scaljeri/flow-based';

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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ComponentSelectionComponent } from './components/component-selection/component-selection.component';
import { FullscreenOverlayContainer, OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ComponentSelectionService } from './component-selection.service';
import { RandomNumbersSmallComponent } from './nodes/random-numbers/random-numbers-small.component';
import { RandomNumbersNormalComponent } from './nodes/random-numbers/random-numbers-normal.component';
import { RandomNumbersSettingsComponent } from './nodes/random-numbers/random-numbers-settings.component';
import { BasicGraphSmallComponent } from './nodes/basic-graph/basic-graph-small.component';
import { BasicGraphNormalComponent } from './nodes/basic-graph/basic-graph-normal.component';
import { BasicGraphFullComponent } from './nodes/basic-graph/basic-graph-full.component';
import { MergeStreamsSmallComponent } from './nodes/merge-streams/merge-streams-small.component';
import { MergeStreamsNormalComponent } from './nodes/merge-streams/merge-streams-normal.component';
import { FB_CONFIG, FB_SOCKET_PALETTE } from './fb-settings';
import { NODE_HELPERS } from './node-helpers';
import { StatsSmallComponent } from './nodes/stats/stats-small.component';
import { StatsNormalComponent } from './nodes/stats/stats-normal.component';
import { StatsFullComponent } from './nodes/stats/stats-full.component';
import { CustomCodeSmallComponent } from './nodes/custom-code/custom-code-small.component';
import { CustomCodeNormalComponent } from './nodes/custom-code/custom-code-normal.component';
import { CustomCodeFullComponent } from './nodes/custom-code/custom-code-full.component';
import { FractalSmallComponent } from './nodes/fractal/fractal-small.component';
import { FractalSettingsComponent } from './nodes/fractal/fractal-settings.component';
import { ZoomCanvasSmallComponent } from './nodes/zoom-canvas/zoom-canvas-small.component';
import { ZoomCanvasNormalComponent } from './nodes/zoom-canvas/zoom-canvas-normal.component';
import { ZoomCanvasFullComponent } from './nodes/zoom-canvas/zoom-canvas-full.component';
import { CanvasSmallComponent } from './nodes/canvas/canvas-small.component';
import { CanvasNormalComponent } from './nodes/canvas/canvas-normal.component';
import { CanvasFullComponent } from './nodes/canvas/canvas-full.component';

@NgModule({
  declarations: [
    AppComponent,
    RandomNumbersSmallComponent,
    RandomNumbersNormalComponent,
    RandomNumbersSettingsComponent,
    TapSmallComponent,
    TapNormalComponent,
    TapFullComponent,
    SubflowComponent,
    SubflowSettingsComponent,
    TypeColorsComponent,
    ModulesDialogComponent,
    FlowsDialogComponent,
    FlowComponent,
    ComponentSelectionComponent,
    BasicGraphSmallComponent,
    BasicGraphNormalComponent,
    BasicGraphFullComponent,
    MergeStreamsSmallComponent,
    MergeStreamsNormalComponent,
    StatsSmallComponent,
    StatsNormalComponent,
    StatsFullComponent,
    CustomCodeSmallComponent,
    CustomCodeNormalComponent,
    CustomCodeFullComponent,
    FractalSmallComponent,
    FractalSettingsComponent,
    ZoomCanvasSmallComponent,
    ZoomCanvasNormalComponent,
    ZoomCanvasFullComponent,
    CanvasSmallComponent,
    CanvasNormalComponent,
    CanvasFullComponent,
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
    MatProgressSpinnerModule,
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
    }, {
      /*
       * The editors' type comparison runs on the module registry's refinement
       * chains. A factory closing over the service, so the answer follows the
       * registry as modules come and go.
       */
      provide: FB_TYPE_ASSIGNABILITY,
      useFactory: (modules: ModulesService) => (from: string, to: string) => modules.formats.assignable(from, to),
      deps: [ModulesService]
    }, {
      /*
       * And the same registry answers what a pressed socket carries. A factory
       * again, because a module loaded later brings types with it.
       */
      provide: FB_FORMAT_INFO,
      useFactory: (modules: ModulesService) => (name: string) => {
        const def = modules.formats.get(name);

        return def
          ? { ...def, color: def.color ?? (FB_SOCKET_PALETTE as FbSocketColors)[name] }
          : undefined;
      },
      deps: [ModulesService]
    }
  ],
  /*
   * `entryComponents` was removed in v16. Ivy resolves dynamically created
   * components without pre-registration, which is what the node registry
   * (FB_CONFIG -> DynamicComponentDirective) relies on.
   */
  // For <fb-flow-document> in the app template — a web component, registered by
  // the lit package the editor wrapper already imports.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule {
}
