import { EnvironmentInjector, EventEmitter, Injectable, inject } from '@angular/core';
import {
  FB_NODE_TYPES,
  FB_SOCKET_COLORS,
  FbFormatDef,
  FbFormatRegistry,
  FbModule,
  FbNodeTypes,
  FlowBasedService,
  angularNodeTypes,
  prepareModule,
} from '@scaljeri/flow-based';
import { FB_BASE_SHAPES, FB_MODULE_CONTRACT_VERSION, FbSocketColors } from '@scaljeri/flow-based-core';
import { FB_SOCKET_PALETTE } from './fb-settings';
import { APP_VERSION } from './version';

export type { FbModule };

export interface FbModuleInfo {
  id: string;
  title: string;
  description: string;
  /**
   * The type-name prefix its node types carry.
   *
   * Known from the build for the shipped ones and only after a first load for
   * one fetched from a URL — which is exactly why it is remembered here: it is
   * what lets a saved flow say which modules it needs before any of them have
   * been downloaded.
   */
  prefix?: string;
  /** Where it came from, for a module that is not part of this build. */
  url?: string;
  /** Being fetched right now — the dialog shows a spinner on this row. */
  loading?: boolean;
  enabled?: boolean;
  /** What went wrong the last time it was asked for. Cleared on success. */
  error?: string;
}

/** A module this deployment hosts, offered without anybody typing an address. */
export interface FbCatalogueEntry {
  url: string;
  title: string;
  description: string;
  prefix?: string;
}

/** What a flow records about the modules it needs. */
export interface FbFlowModule {
  url: string;
  prefix?: string;
}

const STORAGE_KEY = 'fb-modules';

/**
 * Types this browser was told about by hand.
 *
 * Modules bring types with them; a reader building a flow may need one that no
 * module defines — a temperature, a station code — and inventing it should not
 * require writing a module. Kept apart from the module list because they are a
 * different kind of thing: a module is code, a type is a name and a promise.
 */
const TYPES_KEY = 'fb-types';

/**
 * What the browser remembers.
 *
 * Version 2 because there was a version 1: a bare array of enabled ids. A
 * module fetched from a URL has to be remembered as well as enabled — forget
 * the URL and the module is simply gone — so the shape grew, and the old array
 * is still read.
 */
interface FbStoredModules {
  version: 2;
  enabled: string[];
  urls: { url: string; title: string; description: string; prefix?: string }[];
}

/*
 * Each shipped module is its own PACKAGE in the workspace — flow-based-math,
 * flow-based-graphs — and a dynamic import here, so the bundler splits it
 * into its own chunk and enabling one genuinely DOWNLOADS it: the editor
 * does not carry mathjs (~1MB of algebra) for users who never open the math
 * group.
 */
const LOADERS: Record<string, () => Promise<FbModule>> = {
  math: () => import('@scaljeri/flow-based-math').then(m => m.MATH_MODULE),
  complex: () => import('@scaljeri/flow-based-complex').then(m => m.COMPLEX_MODULE),
  graphs: () => import('@scaljeri/flow-based-graphs').then(m => m.GRAPHS_MODULE),
  network: () => import('@scaljeri/flow-based-network').then(m => m.NETWORK_MODULE),
  data: () => import('@scaljeri/flow-based-data').then(m => m.DATA_MODULE),
};

/**
 * Fetch a module from the internet.
 *
 * A plain dynamic import of a runtime string: the bundler cannot know the
 * target and leaves it to the browser, which is the whole point. What comes
 * back is a module namespace, and the module itself is its default export —
 * or, failing that, the first export that looks like one, so a module written
 * `export const WEATHER_MODULE = …` works too.
 */
async function fetchModule(url: string): Promise<FbModule> {
  const namespace = await import(/* @vite-ignore */ /* webpackIgnore: true */ url) as Record<string, unknown>;
  const candidate = looksLikeModule(namespace['default'])
    ? namespace['default']
    : Object.values(namespace).find(looksLikeModule);

  if (!candidate) {
    throw new Error('That URL loaded, but exports no module: expected an object with name, prefix and types');
  }

  return candidate as FbModule;
}

/**
 * Is this a module?
 *
 * Checked before anything is registered, because the failure otherwise happens
 * later and elsewhere — a missing `types` surfaces as an empty palette group
 * with no clue as to why.
 */
function looksLikeModule(value: unknown): boolean {
  const module = value as Partial<FbModule> | undefined;

  return !!module
    && typeof module.name === 'string'
    && typeof module.prefix === 'string'
    && !!module.types
    && Object.keys(module.types).length > 0;
}

/**
 * Loadable node-type modules.
 *
 * A module is a bundle of node types that joins the registry at runtime. The
 * registry OBJECT is shared — the palette injects it, and every editor's
 * adapter map is derived from it — so enabling a module mutates that object
 * and patches the active editors, rather than rebuilding either.
 *
 * Modules come from two places, and deliberately down one path: the ones that
 * ship with this build (`LOADERS` is the list), and any number fetched from a
 * URL. Everything after
 * the fetch — settling formats, patching editors, persisting the choice — is
 * the same code, because a module from the internet is not a lesser kind of
 * module.
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

  /** The type names each loaded module brought, so forgetting one is exact. */
  private readonly loadedTypes = new Map<string, string[]>();

  /**
   * The load in flight per module id.
   *
   * Because `await enable(id)` has to mean "its types are registered", not
   * "somebody else started fetching it". It returned immediately when a load
   * was already running, so a second caller — the Flows dialog, a test, a flow
   * naming the same module — carried on with an empty registry: `addNode`
   * answered undefined and the nodes drew as empty boxes. The window is a
   * network fetch wide, which on a slow machine is most of the time.
   */
  private readonly loading = new Map<string, Promise<void>>();

  /**
   * What this deployment hosts itself.
   *
   * There is no community server yet, so the server is the site the app is
   * served from: a handful of modules published beside it, listed in
   * `modules/index.json`. They are fetched by URL like anybody else's — the
   * shortcut is only that the address is already known.
   */
  catalogue: FbCatalogueEntry[] = [];

  constructor() {
    /*
     * The framework's base types first — number, boolean, string, object, as
     * core defines them — then the app's palette on top. Every refinement
     * chain a module brings ends on one of these names.
     */
    for (const name of Object.keys(FB_BASE_SHAPES)) {
      this.formats.seed({ name });
    }

    for (const [name, color] of Object.entries(FB_SOCKET_PALETTE)) {
      this.formats.seed({ name, color });
    }

    // And whatever this browser invented, before any module can claim the name.
    for (const def of this.storedTypes()) {
      this.formats.seed(def);

      if (def.color) {
        this.colors[def.name] ??= def.color;
      }
    }
  }

  /**
   * Define a type by hand, and remember it.
   *
   * Seeded rather than registered: a hand-made type is this browser's own and
   * takes the name it was given, while a module arriving later with the same
   * name is the one that has to disambiguate. It is also why the seeding above
   * happens before any module loads.
   */
  defineType(def: FbFormatDef): void {
    this.formats.seed(def);
    this.formats.audit();

    if (def.color) {
      this.colors[def.name] ??= def.color;
    }

    const kept = this.storedTypes().filter(stored => stored.name !== def.name);

    localStorage.setItem(TYPES_KEY, JSON.stringify([...kept, def]));
    this.changed.emit();
  }

  /** The types this browser invented, as last written. */
  private storedTypes(): FbFormatDef[] {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(TYPES_KEY) ?? '[]');

      return Array.isArray(raw) ? raw as FbFormatDef[] : [];
    } catch {
      return [];
    }
  }

  readonly modules: FbModuleInfo[] = [
    {
      id: 'math',
      prefix: 'math',
      title: 'Mathematics',
      description: 'Operators, a formula editor with live notation, and derivatives.',
    },
    {
      id: 'complex',
      prefix: 'complex',
      title: 'Complex numbers',
      description: 'The plane behind the imaginary-numbers article: labelled points, the z²+c iteration, the Mandelbrot field and its viewpoints.',
    },
    {
      id: 'graphs',
      prefix: 'graph',
      title: 'Graphs',
      description: 'Plot a stream over time — as a line, an area or bars.',
    },
    {
      id: 'network',
      prefix: 'net',
      title: 'Network',
      description: 'Data that arrives on somebody else\'s schedule: requests, and what answers them.',
    },
    {
      id: 'data',
      prefix: 'data',
      title: 'Data',
      description: 'Reshape what flows — take the part you meant out of whatever arrived.',
    },
  ];

  /** The ones that came from a URL, which are the ones that can be forgotten. */
  get fetched(): FbModuleInfo[] {
    return this.modules.filter(info => !!info.url);
  }

  /** Modules enabled on an earlier visit load with the app. */
  async restore(): Promise<void> {
    const stored = this.persisted();

    /*
     * Listed before they are enabled, and listed even when they are not: a URL
     * the reader added is theirs, and a module they switched off should still
     * be in the dialog to switch back on rather than having to be found again.
     */
    /*
     * Own libs are re-stamped to THIS build before anything loads. The store
     * holds the URL of whatever deploy last ran, and restoring it verbatim
     * executed the stale lib on every boot after a redeploy — the exact
     * staleness the ?v= stamp exists to prevent. The enabled ids are mapped
     * through the same rewrite, or they would name rows that no longer exist.
     */
    const restamp = (url: string) => this.isOwnLib(url) ? this.withBuild(url) : url;

    for (const entry of stored.urls) {
      this.remember(entry.url ? { ...entry, url: restamp(entry.url) } : entry);
    }

    await Promise.all(stored.enabled.map(id =>
      this.enable(id.startsWith('url:') ? `url:${restamp(id.slice(4))}` : id)));
  }

  /**
   * Read the list of modules published beside this app.
   *
   * Absent is not an error: a development build has no catalogue, and a
   * dialog that shouted about it would be wrong every day. The section simply
   * is not drawn.
   */
  async loadCatalogue(): Promise<void> {
    try {
      const index = new URL('modules/index.json', document.baseURI);
      const response = await fetch(index.href);

      if (!response.ok) {
        return;
      }

      const entries = await response.json() as FbCatalogueEntry[];

      // Resolved against the catalogue, not the page: the list says
      // `modules/triggers.js` and stays true wherever the app is mounted.
      this.catalogue = entries.map(entry => ({ ...entry, url: new URL(entry.url, index).href }));
      this.changed.emit();
    } catch {
      // Offline, or no such file. Nothing to offer, and nothing to say.
    }
  }

  /** The published ones this browser does not already know about. */
  get offered(): FbCatalogueEntry[] {
    return this.catalogue.filter(entry => !this.modules.some(info => info.url === entry.url));
  }

  /**
   * Add a module from the internet.
   *
   * The URL is resolved against this page, so a relative one works and a typo
   * fails here rather than as a mystery import error. Everything else the
   * module might do wrong — not being a module, not being reachable, being
   * blocked by CORS — comes back as `error` on its row, because a dialog that
   * silently does nothing is the worst of the possible answers.
   */
  async addFromUrl(url: string): Promise<FbModuleInfo> {
    const href = ModulesService.absolute(url);
    // Matched per LIB, not per deploy: the same URL under a different build
    // stamp is the same module, and an exact-id miss minted a second row
    // beside the consented one.
    const base = ModulesService.unversioned(href);
    const existing = this.modules.find(info =>
      info.url && ModulesService.unversioned(info.url) === base);
    const info = existing ?? this.remember({ url: href, title: href, description: 'Not loaded yet' });

    await this.enable(info.id);

    if (info.error) {
      throw new Error(info.error);
    }

    return info;
  }

  /**
   * Enable whatever a flow needs.
   *
   * Two questions, because a flow answers them differently. Its own node types
   * name the SHIPPED modules by prefix — `net-request` belongs to the module
   * whose prefix is `net` — and that is enough for anything in this build.
   * A module from the internet cannot be named that way, so the flow carries
   * its URL: without that a flow shared with somebody else is a document they
   * cannot open, and the failure looks like a broken file rather than a
   * missing download.
   */
  async enableFor(flow: FbFlowLike | undefined): Promise<void> {
    const declared = (flow?.config?.modules ?? []) as FbFlowModule[];

    for (const entry of declared) {
      let href: string;

      try {
        href = ModulesService.absolute(entry.url);
      } catch {
        continue;
      }

      // A lib in OUR OWN module directory is ours: `assets/modules/` is where
      // this build serves the libs it ships, and a stranger's flow cannot put a
      // file there — pointing at it resolves to one of our files or a 404, never
      // their code. So it loads without asking, cache-busted by the build so a
      // stale copy cannot outlive a flow that needs a newer one. Anything else —
      // any other same-origin path, any other origin — is gated below. Same-
      // origin is NOT enough on its own: a flow could name `/whatever.js`, and
      // trusting the origin would run it.
      const own = this.isOwnLib(href);
      const target = own ? this.withBuild(href) : href;
      // Consent is per LIB: a declaration that differs from the remembered row
      // only by build stamp is the same module, and an exact-id miss superseded
      // the ENABLED row with a switched-off twin — the module kept running
      // while its switch showed off, then drew empty boxes after reload.
      const base = ModulesService.unversioned(target);
      const existing = this.modules.find(info =>
        info.url && ModulesService.unversioned(info.url) === base);

      /*
       * A module this browser has CONSENTED to is loaded; one it has never seen
       * is only LISTED — unless it is one of our own shipped libs, which loads.
       *
       * The difference is consent. Opening a document must not run code the
       * reader has not agreed to run — a flow is a file, files arrive by email,
       * and "opening it fetched and executed a script from a stranger's server"
       * is the shape of a drive-by. So an unknown module appears in the dialog,
       * next to the warning, with its switch off, and the nodes that need it draw
       * as empty boxes until it is turned on.
       *
       * The gate is `enabled`, NOT "have I seen it": a module that was merely
       * listed on a first open is remembered in memory, so a naive "known?" check
       * treated the SECOND open (reopen the flow, or open another flow that uses
       * it) as consent and ran it — a drive-by one interaction later, which also
       * silently un-did a disable. So a remembered-but-unconsented module is left
       * exactly as it is: listed, off, not run.
       */
      if (existing?.enabled) {
        await this.enable(existing.id);
      } else if (own) {
        /*
         * A module that FAILS to load must not discard the flow. addFromUrl
         * rethrows on a load failure (a 404 after a redeploy, an offline
         * open), and two of enableFor's callers do not guard it — a shared
         * link or an uploaded file was thrown away whole, with the wrong
         * reason. The node draws as an empty box instead; the row carries the
         * error. Other modules in the same flow still load.
         */
        await this.addFromUrl(target).catch(err =>
          console.warn(`[flow-based] module ${target} failed to load; its nodes will be empty.`, err));
      } else if (!existing) {
        this.remember({
          url: href,
          prefix: entry.prefix,
          title: href,
          description: 'Asked for by this flow. Not loaded — enable it if you trust it.',
        });
      }
    }

    const prefixes = this.prefixesIn(flow);

    /*
     * Shipped modules only — `!info.url`. A fetched module's prefix appears in
     * the flow exactly as a shipped one's does, so without this the loop above
     * declines to run a stranger's module and this line runs it two statements
     * later. Consent is not a property of one branch; it has to hold for every
     * path that can load.
     */
    await Promise.all(
      this.modules
        .filter(info => !info.url && info.prefix && prefixes.has(info.prefix))
        .map(info => this.enable(info.id)),
    );
  }

  /**
   * Record in the flow which fetched modules it depends on.
   *
   * Called before a flow is stored or downloaded. Only the fetched ones: the
   * shipped modules are named by the type names already in the document, and
   * writing a URL for those would tie a flow to one deployment of this app.
   */
  stamp(flow: FbFlowLike | undefined): void {
    if (!flow) {
      return;
    }

    const prefixes = this.prefixesIn(flow);
    const needed = this.fetched
      .filter(info => info.prefix && prefixes.has(info.prefix))
      .map(info => ({ url: info.url!, prefix: info.prefix }));

    const config = (flow.config ??= {});

    /*
     * KEEP any declaration this pass cannot account for. A module whose load
     * FAILED (a 404 after a redeploy, an offline open) was remembered without a
     * prefix, so it can never appear in `needed` — and dropping it here deleted
     * the flow's only record of which lib it needs: one draft flush during an
     * outage and the flow could never find its nodes again, even after the lib
     * came back. A stale duplicate URL is a far smaller cost than that.
     */
    const kept = (config.modules ?? []).filter(entry => {
      let href: string;

      try {
        href = ModulesService.absolute(entry.url);
      } catch {
        // A hand-broken entry (the JSON is user-editable) must not make the
        // flow unsaveable — stamp sits on every save/download/share path.
        // Kept verbatim: unaccounted-for declarations survive, garbage or not.
        return true;
      }

      // Own libs are remembered with a build stamp, remote ones bare — match either.
      const info = this.fetched.find(candidate =>
        candidate.url === href || candidate.url === this.withBuild(href));

      // A LOADED module is fully accounted for: used → it is in `needed`,
      // unused → dropping it is stamp's cleanup job. Only the unaccountable
      // (failed or never-seen) declaration is kept.
      return !info || !info.prefix;
    });

    const modules = [...needed, ...kept];

    if (modules.length) {
      config.modules = modules;
    } else {
      delete config.modules;
    }
  }

  enable(id: string): Promise<void> {
    const info = this.modules.find(m => m.id === id);

    if (!info || info.enabled) {
      return Promise.resolve();
    }

    // Everyone waiting on this module waits on the SAME load.
    const running = this.loading.get(id);

    if (running) {
      return running;
    }

    const load = this.load(info).finally(() => this.loading.delete(id));

    this.loading.set(id, load);

    return load;
  }

  private async load(info: FbModuleInfo): Promise<void> {
    const id = info.id;

    info.loading = true;
    info.error = undefined;
    this.changed.emit();

    try {
      const mod = info.url ? await fetchModule(info.url) : await LOADERS[id]?.();

      if (!mod) {
        throw new Error(`No such module: ${id}`);
      }

      /*
       * A module built against a NEWER contract than this host speaks may use
       * something the host has not learned yet. Warned, never blocked — the same
       * posture a flow's format version takes, so an old host still loads a newer
       * module and simply degrades where it cannot follow. Absent = pre-versioning.
       */
      if (mod.contract && mod.contract > FB_MODULE_CONTRACT_VERSION) {
        console.warn(
          `Module "${mod.name}" was built against contract v${mod.contract}, but this `
          + `editor speaks v${FB_MODULE_CONTRACT_VERSION}; parts of it may not work.`,
        );
      }

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
      this.loadedTypes.set(id, Object.keys(prepared.types));
      this.patchEditors(prepared.types);

      // What it calls itself wins over what the URL happened to look like.
      info.prefix = mod.prefix;
      info.title = mod.name || info.title;
      info.description = mod.description ?? info.description;
      info.enabled = true;
      this.persist();
    } catch (error) {
      /*
       * A blocked cross-origin import arrives as a bare TypeError with no
       * detail — the browser will not say more — so the message names the
       * likely cause rather than repeating the browser's shrug.
       */
      const message = (error as Error).message ?? String(error);

      info.error = /dynamically imported module|Failed to fetch/i.test(message)
        ? 'Could not load — unreachable, blocked by CORS, or not a module'
        : message;
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

    // The names this module brought, remembered when it loaded. Asking the
    // module again would mean fetching it to find out how to remove it.
    for (const key of this.loadedTypes.get(id) ?? []) {
      delete this.types[key];

      for (const editor of this.flowService.allEditors) {
        delete editor.types[key];
      }
    }

    this.loadedTypes.delete(id);
    info.enabled = false;
    this.persist();
    this.changed.emit();
  }

  /** Drop a fetched module from the list entirely; the shipped ones stay. */
  forget(id: string): void {
    const index = this.modules.findIndex(m => m.id === id);

    if (index < 0 || !this.modules[index].url) {
      return;
    }

    this.disable(id);
    this.modules.splice(index, 1);
    this.persist();
    this.changed.emit();
  }

  /** A URL as this page would resolve it, so a typo fails here and not later. */
  private static absolute(url: string): string {
    try {
      return new URL(url.trim(), location.href).href;
    } catch {
      throw new Error('That is not a URL');
    }
  }

  /**
   * Whether a URL is one of the libs THIS build ships — same origin, and under
   * the `assets/modules/` directory `build-libs.mjs` writes to.
   *
   * Same origin alone is not enough: a flow could declare `/anything.js` and the
   * origin would vouch for a file we never put there. The directory is the line
   * — a stranger cannot host under our `assets/modules/`, so a URL there is ours
   * or a 404, never their code.
   */
  private isOwnLib(href: string): boolean {
    try {
      const url = new URL(href);

      return url.origin === location.origin && url.pathname.includes('/assets/modules/');
    } catch {
      return false;
    }
  }

  /**
   * Tag one of our lib URLs with the build, so a redeploy fetches it fresh.
   *
   * A module is `import()`ed, whose cache mode cannot be set, so the query is
   * the only lever — found on a phone that kept an old lib under a flow that
   * needed a newer one. Only for OUR libs: a stranger's URL is left untouched.
   */
  private withBuild(href: string): string {
    const url = new URL(href);

    url.searchParams.set('v', APP_VERSION.split(' ')[0]);

    return url.href;
  }

  /** The URL with its build stamp removed — one lib, whatever deploy fetched it. */
  private static unversioned(url: string): string {
    try {
      const parsed = new URL(url);

      parsed.searchParams.delete('v');

      return parsed.href;
    } catch {
      return url;
    }
  }

  /** List a fetched module without loading it. */
  private remember(entry: { url: string; title: string; description: string; prefix?: string }): FbModuleInfo {
    let transfer = false;
    /*
     * One row per LIB, not per deploy. Our own libs are fetched with a build
     * stamp (?v=1.2.3), and every redeploy minted a fresh id beside the old
     * one: duplicate dialog rows, a double fetch per boot — and disabling the
     * STALE row deleted the type names the live one had registered, killing
     * its nodes. A stale same-lib entry is superseded, not accumulated.
     */
    if (entry.url) {
      const base = ModulesService.unversioned(entry.url);
      const stale = this.modules.filter(info =>
        info.url && info.url !== entry.url && ModulesService.unversioned(info.url) === base);

      // Consent follows the lib. Superseding an ENABLED twin used to leave the
      // fresh row switched off: the old build's types kept running while the
      // dialog showed the module off, and the next reload drew empty boxes.
      const consented = stale.some(twin => twin.enabled);

      for (const twin of stale) {
        this.loadedTypes.delete(twin.id);
        this.modules.splice(this.modules.indexOf(twin), 1);
      }

      // The enable happens below, once the fresh row is in the list.
      transfer = consented;
    }

    const info: FbModuleInfo = {
      id: `url:${entry.url}`,
      url: entry.url,
      prefix: entry.prefix,
      title: entry.title,
      description: entry.description,
    };

    this.modules.push(info);

    if (transfer) {
      // Async on purpose: remember() is sync and callers do not wait. The
      // successor build loads and re-registers the lib's types over the
      // stale ones.
      void this.enable(info.id);
    }

    this.changed.emit();

    return info;
  }

  /** Every type-name prefix used anywhere in a flow, subflows included. */
  private prefixesIn(flow: FbFlowLike | undefined): Set<string> {
    const found = new Set<string>();
    const walk = (node: FbFlowLike | undefined) => {
      for (const child of node?.children ?? []) {
        const prefix = child.type?.split('-')[0];

        if (prefix) {
          found.add(prefix);
        }

        walk(child);
      }
    };

    walk(flow);

    return found;
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
        /*
         * load() re-roots the editor, which would yank a reader OUT of the
         * subflow they are looking at the moment a lazily loaded module
         * lands. Remember the trail and walk back in — by id, because the
         * reload keeps the same state objects.
         */
        const trail = editor.path.slice(1).map(node => node.id!);

        editor.load(editor.root);

        for (const id of trail) {
          editor.enter(id);
        }
      } else {
        editor.changes.emit({ kind: 'structure' });
      }
    }
  }

  private containsAny(node: { type?: string; children?: unknown[] } | undefined, names: Set<string>): boolean {
    return (node?.children as { type?: string; children?: unknown[] }[] | undefined)
      ?.some(child => names.has(child.type!) || this.containsAny(child, names)) ?? false;
  }

  private persisted(): FbStoredModules {
    const empty: FbStoredModules = { version: 2, enabled: [], urls: [] };

    try {
      const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

      // Version 1 was a bare array of enabled ids, and browsers still hold it.
      if (Array.isArray(raw)) {
        return { ...empty, enabled: raw as string[] };
      }

      const stored = raw as Partial<FbStoredModules> | null;

      return stored
        ? { version: 2, enabled: stored.enabled ?? [], urls: stored.urls ?? [] }
        : empty;
    } catch {
      return empty;
    }
  }

  private persist(): void {
    const stored: FbStoredModules = {
      version: 2,
      enabled: this.modules.filter(m => m.enabled).map(m => m.id),
      urls: this.fetched.map(({ url, title, description, prefix }) => ({ url: url!, title, description, prefix })),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }
}

/** As much of a flow as this service reads. */
interface FbFlowLike {
  type?: string;
  config?: { modules?: FbFlowModule[]; [key: string]: unknown };
  children?: FbFlowLike[];
}
