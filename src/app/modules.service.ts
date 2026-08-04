import { EnvironmentInjector, EventEmitter, Injectable, inject } from '@angular/core';
import {
  FB_NODE_TYPES,
  FB_SOCKET_COLORS,
  FbFormatRegistry,
  FbModule,
  FbNodeTypes,
  FlowBasedService,
  angularNodeTypes,
  prepareModule,
} from '@scaljeri/flow-based';
import { FbSocketColors } from '@scaljeri/flow-based-core';
import { FB_SOCKET_PALETTE } from './fb-settings';

export type { FbModule };

export interface FbModuleInfo {
  id: string;
  title: string;
  description: string;
  /** Being fetched right now — the dialog shows a spinner on this row. */
  loading?: boolean;
  enabled?: boolean;
}

const STORAGE_KEY = 'fb-modules';

/*
 * Each module is its own PACKAGE in the workspace — flow-based-math,
 * flow-based-graphs — and a dynamic import here, so the bundler splits it
 * into its own chunk and enabling one genuinely DOWNLOADS it: the editor
 * does not carry mathjs (~1MB of algebra) for users who never open the math
 * group. Adding a module means adding a package and one line in this map.
 */
const LOADERS: Record<string, () => Promise<FbModule>> = {
  math: () => import('@scaljeri/flow-based-math').then(m => m.MATH_MODULE),
  graphs: () => import('@scaljeri/flow-based-graphs').then(m => m.GRAPHS_MODULE),
};

/**
 * Loadable node-type modules.
 *
 * A module is a bundle of node types that joins the registry at runtime. The
 * registry OBJECT is shared — the palette injects it, and every editor's
 * adapter map is derived from it — so enabling a module mutates that object
 * and patches the active editors, rather than rebuilding either.
 *
 * The choice persists per browser: the whole point of enabling a module is
 * not having to do it again tomorrow.
 */
@Injectable({ providedIn: 'root' })
export class ModulesService {
  private readonly types = inject<FbNodeTypes>(FB_NODE_TYPES);
  private readonly colors = inject<FbSocketColors>(FB_SOCKET_COLORS);
  private readonly injector = inject(EnvironmentInjector);
  private readonly flowService = inject(FlowBasedService);

  readonly changed = new EventEmitter<void>();

  /**
   * The book of data types. Seeded with the app's own palette, so a module
   * declaring 'number' compatibly SHARES it rather than colliding with it.
   */
  readonly formats = new FbFormatRegistry();

  constructor() {
    for (const [name, color] of Object.entries(FB_SOCKET_PALETTE)) {
      this.formats.seed({ name, color });
    }
  }

  readonly modules: FbModuleInfo[] = [
    {
      id: 'math',
      title: 'Mathematics',
      description: 'Operators, a formula editor with live notation, and derivatives.',
    },
    {
      id: 'graphs',
      title: 'Graphs',
      description: 'Plot a stream over time — as a line, an area or bars.',
    },
  ];

  /** Modules enabled on an earlier visit load with the app. */
  restore(): Promise<void> {
    return Promise.all(this.persisted().map(id => this.enable(id))).then(() => undefined);
  }

  async enable(id: string): Promise<void> {
    const info = this.modules.find(m => m.id === id);
    const loader = LOADERS[id];

    if (!info || !loader || info.enabled || info.loading) {
      return;
    }

    info.loading = true;
    this.changed.emit();

    try {
      const mod = await loader();

      /*
       * Settle the module's type names first: a declared type that collides
       * with a DIFFERENT existing type comes back prefixed, and the module's
       * sockets are rewritten to speak the settled names. The colours a
       * module brings only fill gaps — an app or user choice stands.
       */
      const prepared = prepareModule(mod, this.formats);

      for (const [name, color] of Object.entries(prepared.colors)) {
        this.colors[name] ??= color;
      }

      Object.assign(this.types, prepared.types);
      this.patchEditors(prepared.types);
      info.enabled = true;
      this.persist();
    } finally {
      info.loading = false;
      this.changed.emit();
    }
  }

  /**
   * Forgetting a module removes its types from the palette; nodes already in
   * a flow keep running until reload — and even then the engine skips an
   * unknown type rather than failing the document.
   */
  disable(id: string): void {
    const info = this.modules.find(m => m.id === id);

    if (!info?.enabled) {
      return;
    }

    // The loader resolves the same chunk it already fetched; this is a map
    // lookup, not a second download.
    void LOADERS[id]().then(mod => {
      for (const key of Object.keys(mod.types)) {
        delete this.types[key];

        for (const editor of this.flowService.allEditors) {
          delete editor.types[key];
        }
      }

      info.enabled = false;
      this.persist();
      this.changed.emit();
    });
  }

  /** New types have to reach the running editors' adapter maps too. */
  private patchEditors(types: FbNodeTypes): void {
    const mounted = angularNodeTypes(types, this.injector);
    const names = new Set(Object.keys(types));

    for (const editor of this.flowService.allEditors) {
      Object.assign(editor.types, mounted);

      /*
       * A document that ALREADY contains nodes of these types was loaded
       * before its module arrived: the engine skipped their workers (unknown
       * type), so those nodes drew nothing and their settings drove nothing.
       * Reloading the root rebuilds the engine with the types now present.
       * A document without them just gets a re-render, which is what makes
       * the palette's new group and any empty boxes catch up.
       */
      if (this.containsAny(editor.root, names)) {
        editor.load(editor.root);
      } else {
        editor.changes.emit({ kind: 'structure' });
      }
    }
  }

  private containsAny(node: { type?: string; children?: unknown[] } | undefined, names: Set<string>): boolean {
    return (node?.children as { type?: string; children?: unknown[] }[] | undefined)
      ?.some(child => names.has(child.type!) || this.containsAny(child, names)) ?? false;
  }

  private persisted(): string[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.modules.filter(m => m.enabled).map(m => m.id)));
  }
}
