import { FbShape, shapeFits, typeScriptOf } from './shapes';
import { FbNodeTypes } from './types';

/**
 * The version of the module contract this build of core speaks.
 *
 * A module MAY stamp the version it was built against in `FbModule.contract`; the
 * host warns (never blocks) when a module expects a newer contract than it speaks
 * — the same posture `FB_FLOW_FORMAT_VERSION` takes for a saved flow. Absent means
 * "pre-versioning", read as 1 and never rejected, so every module written so far
 * keeps loading. Bump this the day the contract changes in a way a module can
 * feel.
 */
export const FB_MODULE_CONTRACT_VERSION = 1;

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
  /**
   * The base this type refines: `temperature` refines `number`. A refinement
   * is its base's shape wearing a meaning — it satisfies every demand for the
   * base, while the base never satisfies a demand for the refinement.
   */
  refines?: string;
  /** A default colour for its lines; presentation, so never part of identity. */
  color?: string;
  /**
   * What a value of this type LOOKS like, structurally.
   *
   * Optional, and not part of identity — two modules meaning the same thing by
   * `geo` agree because their descriptions agree, not because they wrote the
   * same fields. It exists so a reader who presses a socket can be shown the
   * type the way a programmer reads types, which lands faster than any prose
   * about it.
   */
  shape?: FbShape;
}

/**
 * What a loadable node-type module exports.
 *
 * A module is a bundle of node types that joins the registry at runtime —
 * Mathematics, Graphs, whatever comes next. The shape lives HERE, in core, so a
 * module — including a framework-free one a flow loads from a URL — depends only
 * on this framework-agnostic contract, never on the app that loads it.
 *
 * `TComponent` is generic, mirroring `FbNodeType`: a framework-free module leaves
 * it `unknown` and draws with `FbNodeMount`; the Angular package narrows it to a
 * component type. So the same `FbModule` types a URL lib and an in-tree one.
 */
export interface FbModule<TComponent = unknown> {
  /** How the module introduces itself to a human. */
  name: string;
  /**
   * One line about what is in it, for the list a reader chooses from.
   *
   * Optional, and the module's own: a module fetched from a URL has nothing
   * else to say for itself, and a row reading only its address tells a reader
   * nothing about whether they want it.
   */
  description?: string;
  /**
   * Short code that disambiguates this module's types when a NAME collides
   * with a different type: its 'score' becomes '<prefix>:score'.
   */
  prefix: string;
  /** The data types this module defines; used sockets need no declaration. */
  formats?: FbFormatDef[];
  /**
   * The module contract this was built against (`FB_MODULE_CONTRACT_VERSION`).
   * Optional: absent reads as pre-versioning. A host warns, but still loads, when
   * it is newer than the host speaks.
   */
  contract?: number;
  types: FbNodeTypes<TComponent>;
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

      /*
       * And the shape, on the same reasoning: whichever module happens to load
       * first should not decide how much is known about a type they agree on.
       * Two modules declaring `grid` are the same type — the description says
       * so — and if only one of them wrote down the fields, that is the answer
       * for both.
       */
      if (!existing.def.shape && def.shape) {
        existing.def.shape = def.shape;
      }

      return def.name;
    }

    const prefixed = `${prefix}:${def.name}`;

    if (!this.formats.has(prefixed)) {
      this.formats.set(prefixed, { def: { ...def, name: prefixed }, owner: prefix });

      /*
       * Said out loud, ONCE. A module whose `score` became `game:score` has had
       * its sockets rewritten under it — the right outcome, a confusing one to
       * meet in a dropdown. Inside the guard: pushing on every register()
       * duplicated the line each enable/disable/re-enable cycle.
       */
      this.collisions.push(
        `${prefix} declares ${def.name} differently from the ${existing.owner ?? 'app'}'s, `
        + `so its own sockets speak ${prefixed}.`,
      );
    }

    return prefixed;
  }

  get(name: string): FbFormatDef | undefined {
    return this.formats.get(name)?.def;
  }

  list(): FbFormatDef[] {
    return [...this.formats.values()].map(entry => entry.def);
  }

  /**
   * Whether an OFFERED type satisfies a DEMANDED one: itself, or anything up
   * its refinement chain. This is the function the engine's format comparison
   * runs on. Cycle-guarded, because a registry fed by strangers must not hang.
   */
  assignable = (from: string, to: string): boolean => {
    if (from === to) {
      return true;
    }

    const seen = new Set<string>();
    let current = this.formats.get(from)?.def.refines;

    while (current && !seen.has(current)) {
      if (current === to) {
        return true;
      }

      seen.add(current);
      current = this.formats.get(current)?.def.refines;
    }

    return false;
  };

  private sameType(a: FbFormatDef, b: FbFormatDef): boolean {
    // A different base is a different type, whatever the words say.
    if ((a.refines ?? null) !== (b.refines ?? null)) {
      return false;
    }

    /*
     * A missing description makes no claim, so it agrees with anything.
     *
     * That rule is deliberately not transitive, and cannot be: a bare seed
     * matches two modules that contradict each other. What follows from it is
     * that whoever describes a name FIRST owns it — the second module to
     * describe it differently is prefixed. That is an ordering, not an
     * accident, and it is the only answer available: sockets in a saved flow
     * already speak the incumbent's name, so the incumbent cannot be renamed
     * to make room. `problems` records it so the loser can see what happened.
     */
    return !a.description || !b.description || a.description === b.description;
  }

  /**
   * What went wrong while types were being registered.
   *
   * Reported rather than thrown. A module that declares a base it never
   * defines is broken, but it is somebody else's module and half of it may
   * still work — and the failure it causes otherwise is the worst kind:
   * `assignable` walks a chain that ends nowhere, answers false, and a wire
   * silently refuses to connect with nothing at all to read.
   */
  get problems(): string[] {
    return [...this.collisions, ...this.audited];
  }

  /**
   * Renames register() performed — kept apart from audit()'s findings because
   * audit() recomputes ITS list from scratch, and clearing everything wiped the
   * collision report the very same prepareModule call had just written: the
   * dialog built to explain a renamed type showed nothing, and the user met
   * `game:score` cold in a dropdown.
   */
  private readonly collisions: string[] = [];
  private readonly audited: string[] = [];

  /**
   * Check what a definition claims against what is already known.
   *
   * Called after registration, when the whole module is in — a type may refine
   * a base its own module declares later in the same list.
   */
  audit(): void {
    this.audited.length = 0;

    for (const { def } of this.formats.values()) {
      if (def.refines && !this.formats.has(def.refines)) {
        this.audited.push(
          `${def.name} refines ${def.refines}, which is not a registered type — `
          + 'every connection to it will be refused with no explanation.',
        );

        continue;
      }

      const base = def.refines ? this.formats.get(def.refines)?.def : undefined;

      /*
       * A refinement is its base's shape wearing a meaning. One that is not
       * even the same shape is not a refinement — and since shapes are not
       * enforced when connecting, this is the only place the contradiction
       * can be caught at all.
       */
      if (def.shape && base?.shape && !shapeFits(def.shape, base.shape)) {
        this.audited.push(
          `${def.name} says it refines ${base.name}, but its shape does not fit it: `
          + `${typeScriptOf(def.shape)} is not a ${typeScriptOf(base.shape)}.`,
        );
      }
    }
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
export function prepareModule<TComponent = unknown>(
  module: FbModule<TComponent>,
  registry: FbFormatRegistry,
): { types: FbNodeTypes<TComponent>; colors: Record<string, string> } {
  const renames = new Map<string, string>();
  const colors: Record<string, string> = {};

  for (const def of module.formats ?? []) {
    /*
     * A refinement whose base got prefixed must refine the PREFIXED base —
     * declaration order within the module decides, so a base is declared
     * before its refinements.
     */
    const settled = def.refines && renames.has(def.refines)
      ? { ...def, refines: renames.get(def.refines) }
      : def;

    const finalName = registry.register(settled, module.prefix);

    if (finalName !== def.name) {
      renames.set(def.name, finalName);
    }

    if (def.color) {
      colors[finalName] = def.color;
    }
  }

  /*
   * Audited once the whole module is in, not per type: a type may refine a
   * base its own module declares later in the same list.
   */
  registry.audit();

  if (renames.size === 0) {
    return { types: module.types, colors };
  }

  const rename = (name: string | null | undefined) =>
    name == null ? name : renames.get(name) ?? name;

  const types: FbNodeTypes<TComponent> = {};

  for (const [key, entry] of Object.entries(module.types)) {
    types[key] = {
      ...entry,
      settings: {
        ...entry.settings,
        // Optional-chained: a malformed module (a type with no `settings`)
        // threw here mid-rewrite, with some of its formats already claimed in
        // the registry — a half-registered module.
        sockets: entry.settings?.sockets?.map(socket => ({
          ...socket,
          format: rename(socket.format),
          formats: socket.formats?.map(f => rename(f)!) ?? socket.formats,
        })),
      },
    };
  }

  return { types, colors };
}
