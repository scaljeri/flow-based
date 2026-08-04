import { FbNodeTypes } from './flow-based';

/**
 * A data type a module brings with it: the format names its sockets speak.
 *
 * Two modules may declare the same name. They are the SAME type when their
 * definitions do not demonstrably differ — the description is the identity,
 * and a missing one on either side is compatibility, not conflict. Only when
 * both sides describe the type and describe it differently is it two types
 * wearing one name, and the newcomer gets prefixed.
 */
export interface FbFormatDef {
  name: string;
  /** What the type IS. This is its identity across modules. */
  description?: string;
  /** A default colour for its lines; presentation, so never part of identity. */
  color?: string;
}

/**
 * What a loadable node-type module exports.
 *
 * A module is a bundle of node types that joins the registry at runtime —
 * Mathematics, Graphs, whatever comes next. The shape lives HERE, in the
 * package every module already depends on, so a module does not have to know
 * anything about the app that loads it.
 */
export interface FbModule {
  /** How the module introduces itself to a human. */
  name: string;
  /**
   * Short code that disambiguates this module's types when a NAME collides
   * with a different type: its 'score' becomes '<prefix>:score'.
   */
  prefix: string;
  /** The data types this module defines; used sockets need no declaration. */
  formats?: FbFormatDef[];
  types: FbNodeTypes;
}

interface FbRegisteredFormat {
  def: FbFormatDef;
  /** Which module first defined it; the app's own seed carries no owner. */
  owner?: string;
}

/**
 * The app-wide book of data types.
 *
 * One instance per application. Registering a definition answers with the
 * name to USE: the name itself when it is new or the same type, a prefixed
 * name when it collides with a different type.
 */
export class FbFormatRegistry {
  private readonly formats = new Map<string, FbRegisteredFormat>();

  /** Seed a type the app itself defines, before any module arrives. */
  seed(def: FbFormatDef): void {
    if (!this.formats.has(def.name)) {
      this.formats.set(def.name, { def });
    }
  }

  /**
   * Register a module's type. Returns the name its sockets must speak.
   *
   * Same type — no demonstrable difference — shares the existing name, and
   * the richer description wins so later collisions are judged against it.
   * A different type under an existing name registers as prefix:name.
   */
  register(def: FbFormatDef, prefix: string): string {
    const existing = this.formats.get(def.name);

    if (!existing) {
      this.formats.set(def.name, { def: { ...def }, owner: prefix });

      return def.name;
    }

    if (this.sameType(existing.def, def)) {
      if (!existing.def.description && def.description) {
        existing.def.description = def.description;
      }

      return def.name;
    }

    const prefixed = `${prefix}:${def.name}`;

    if (!this.formats.has(prefixed)) {
      this.formats.set(prefixed, { def: { ...def, name: prefixed }, owner: prefix });
    }

    return prefixed;
  }

  get(name: string): FbFormatDef | undefined {
    return this.formats.get(name)?.def;
  }

  list(): FbFormatDef[] {
    return [...this.formats.values()].map(entry => entry.def);
  }

  private sameType(a: FbFormatDef, b: FbFormatDef): boolean {
    return !a.description || !b.description || a.description === b.description;
  }
}

/**
 * Prepare a module for registration: settle its type names and rewrite its
 * sockets to speak them.
 *
 * Works on a CLONE of the socket declarations — the module's export is shared
 * and must survive a disable/re-enable unrewritten. Returns the node types to
 * register and the colours the module brings for its types.
 */
export function prepareModule(
  module: FbModule,
  registry: FbFormatRegistry,
): { types: FbNodeTypes; colors: Record<string, string> } {
  const renames = new Map<string, string>();
  const colors: Record<string, string> = {};

  for (const def of module.formats ?? []) {
    const finalName = registry.register(def, module.prefix);

    if (finalName !== def.name) {
      renames.set(def.name, finalName);
    }

    if (def.color) {
      colors[finalName] = def.color;
    }
  }

  if (renames.size === 0) {
    return { types: module.types, colors };
  }

  const rename = (name: string | null | undefined) =>
    name == null ? name : renames.get(name) ?? name;

  const types: FbNodeTypes = {};

  for (const [key, entry] of Object.entries(module.types)) {
    types[key] = {
      ...entry,
      settings: {
        ...entry.settings,
        sockets: entry.settings.sockets?.map(socket => ({
          ...socket,
          format: rename(socket.format),
          formats: socket.formats?.map(f => rename(f)!) ?? socket.formats,
        })),
      },
    };
  }

  return { types, colors };
}
