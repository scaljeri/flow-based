import { FbNodeState } from './types';

/**
 * Version of the persisted flow format.
 *
 * 1 — the shape the project has always written: a recursive FbNodeState with
 *     `position` as percentages of the graph plane. Files saved before versioning
 *     existed carry no `version` field and are read as 1, because the shape did
 *     not change when the viewport was introduced (see FbViewportService).
 * 2 — `position`, `view` and `size` move into a `ui` object. They answer a
 *     different question from everything beside them: `config` is what a node
 *     DOES and these are what it looks like, and a diff of two saved flows used
 *     to be mostly coordinates with the one line that mattered lost among them.
 * 3 — two plot types are renamed to say what they draw rather than what they
 *     were first used for: `graph-timeseries` → `graph-plot`, `graph-complex`
 *     → `graph-plane`. Nothing about either node changed; a type name is
 *     simply how a saved flow asks for a drawing, and these two asked by
 *     anecdote.
 * 4 — `graph-mandelbrot` was one node doing two jobs: working out a value for
 *     every point of a square, and colouring the answers. It becomes two —
 *     `math-mandelbrot` computing a field, `graph-field` drawing one — so that
 *     anything can draw a field and anything can produce one.
 * 5 — the 2026-08 palette cleanup, batched into one step because each saved
 *     flow pays per migration, not per change: `basic-graph` (superseded by
 *     `graph-plot`) and `merge-streams` (the same combineLatest sum
 *     `math-add` is) are mapped onto their successors, and `data-choice`
 *     adopts data-switch's 1-based `which` with 0 meaning none.
 */
export const FB_FLOW_FORMAT_VERSION = 5;

export interface FbSerializedFlow {
  version: number;
  flow: FbNodeState;
}

export class FbFlowFormatError extends Error {
  constructor(message: string) {
    super(`[flow-based] ${message}`);
    this.name = 'FbFlowFormatError';
  }
}

/**
 * Migrations from an older version to the NEXT one, keyed by the version being
 * upgraded FROM. A file several versions old walks the chain one step at a
 * time — 1 to 2, 2 to 3 — so every migration only ever reasons about two
 * adjacent shapes, never about history.
 *
 * A migration receives a clone and may mutate it freely. A version WITHOUT a
 * migration is a version whose shape did not change: the file is read as it
 * is and simply adopts the current number on its next save.
 */
const MIGRATIONS: Record<number, (flow: FbNodeState) => FbNodeState> = {
  /*
   * 1 → 2: the three fields that describe the picture rather than the flow
   * move into `ui`. Every node, all the way down, and the flow itself — a
   * subflow is a node and carries a position like any other.
   *
   * Anything already in `ui` wins: a file written by a newer build and then
   * hand-edited back to version 1 would otherwise have its old coordinates
   * put back over its new ones.
   */
  1: flow => {
    const move = (node: FbNodeState): FbNodeState => {
      const legacy = node as FbNodeState & {
        position?: unknown; view?: unknown; size?: unknown;
      };
      const ui = { ...(node.ui ?? {}) } as Record<string, unknown>;

      for (const key of ['position', 'view', 'size'] as const) {
        if (legacy[key] !== undefined && ui[key] === undefined) {
          ui[key] = legacy[key];
        }

        delete legacy[key];
      }

      if (Object.keys(ui).length) {
        node.ui = ui as FbNodeState['ui'];
      }

      (node.children ?? []).forEach(move);

      return node;
    };

    return move(flow);
  },

  /*
   * 2 → 3: rename two node types.
   *
   * A type name that no saved flow can find is a node that renders as an
   * empty box with no error at all — the app has no way to say "this type is
   * gone" (see the app's own fallback), so a rename without a migration is a
   * silent one. Every node, all the way down, including the flow itself: a
   * subflow is a node with a type of its own.
   */
  2: flow => {
    const renamed: Record<string, string> = {
      'graph-timeseries': 'graph-plot',
      'graph-complex': 'graph-plane',
    };

    const rename = (node: FbNodeState): FbNodeState => {
      if (renamed[node.type]) {
        node.type = renamed[node.type];
      }

      (node.children ?? []).forEach(rename);

      return node;
    };

    return rename(flow);
  },

  /*
   * 3 → 4: one node becomes two, wired to each other.
   *
   * The drawing keeps the old node's id and its output, so a document that
   * points a figure at it still finds it and anything downstream of the
   * pressed point stays connected. The computation takes the old INPUT
   * socket, id and all, so whatever fed the region goes on feeding it without
   * the connection being touched. What is new is one node, one socket on each
   * side of the join, and the wire between them.
   *
   * Ids come from above the highest one in the flow. A migration cannot ask
   * the editor for fresh ones — it runs on a file, before anything is built —
   * so it counts what is there and carries on from the top.
   */
  3: flow => {
    let next = highestId(flow) + 1;
    const id = (): number => next++;

    const split = (node: FbNodeState): FbNodeState => {
      const children = node.children ?? [];
      const found = children.filter(child => child.type === 'graph-mandelbrot');

      for (const drawing of found) {
        const config = (drawing.config ?? {}) as { view?: unknown; iterations?: unknown };
        const region = (drawing.sockets ?? []).find(socket => socket.type === 'in');
        const fieldIn = id();
        const fieldOut = id();

        const compute: FbNodeState = {
          type: 'math-mandelbrot',
          id: id(),
          title: 'Asking every point',
          config: { view: config.view, iterations: config.iterations, resolution: 400 },
          sockets: [
            ...(region ? [{ ...region, formats: ['region'], format: undefined }] : []),
            { id: fieldOut, type: 'out', format: 'field' },
          ],
          // Beside the drawing it feeds, a little to its left.
          ui: {
            position: {
              x: Math.max(0, (drawing.ui?.position?.x ?? 0) - 14),
              y: drawing.ui?.position?.y ?? 0,
            },
          },
        };

        drawing.type = 'graph-field';
        drawing.config = { scale: 'log' };
        drawing.sockets = [
          { id: fieldIn, type: 'in', formats: ['field'] },
          ...(drawing.sockets ?? []).filter(socket => socket.type === 'out'),
        ];

        children.push(compute);

        /*
         * A wire that fed the region followed its socket — INCLUDING its `to`.
         * The socket id moved onto the compute node, but a connection names the
         * node as well, and one still saying `to: drawing` was delivered to the
         * drawing's worker for a socket no longer its own: panning the region
         * never reached the computation, and the broken `to` was then saved
         * into v4 for good.
         */
        if (region) {
          for (const wire of node.connections ?? []) {
            if (wire.in === region.id && wire.to === drawing.id) {
              wire.to = compute.id!;
            }
          }
        }

        node.connections = [
          ...(node.connections ?? []),
          { id: id(), from: compute.id!, to: drawing.id!, out: fieldOut, in: fieldIn },
        ];
      }

      // Only when a mandelbrot was actually split: assigning unconditionally
      // stamped `children: []` onto every LEAF, and a node with an (empty)
      // children array is an enterable subflow — so every node in a migrated
      // v3 flow became a double-click-into empty graph. Recurse over the real
      // children either way.
      if (found.length) {
        node.children = children;
      }

      children.forEach(split);

      return node;
    };

    return split(flow);
  },

  /*
   * 4 → 5: the palette cleanup. One migration for several removals, because a
   * saved flow pays per STEP — every change that can share this version
   * number should.
   *
   * `basic-graph` becomes `graph-plot`: same single number input, a strictly
   * better drawing. Its config was presentation defaults graph-plot does not
   * read, so it is dropped rather than carried as dead keys. The passthrough
   * OUT socket has no graph-plot equivalent and goes too — a wire hanging off
   * it is severed HERE, knowingly: the alternative was a socket that lies
   * about being connected to anything.
   */
  4: flow => {
    const migrate = (node: FbNodeState): FbNodeState => {
      for (const child of node.children ?? []) {
        if (child.type === 'basic-graph') {
          const outIds = (child.sockets ?? [])
            .filter(socket => socket.type === 'out')
            .map(socket => socket.id);

          child.type = 'graph-plot';
          child.config = {};
          child.sockets = (child.sockets ?? []).filter(socket => socket.type !== 'out');

          node.connections = (node.connections ?? [])
            .filter(connection => !outIds.includes(connection.out));
        }

        /*
         * merge-streams and math-add were both the combineLatest sum of their
         * inputs; math-add (n-ary since the merge) is the one that stays. The
         * sockets carry over as they are — same shape, two number ins and a
         * number out — and the symbol is what the drawing shows.
         */
        if (child.type === 'merge-streams') {
          // 'add', the registry's actual key for the n-ary sum — 'math-add'
          // is provided by no registry, so a migrated merge-streams loaded as
          // an empty box.
          child.type = 'add';
          child.config = { symbol: '+' };
        }

        /*
         * data-choice adopts data-switch's ordinal language: `which` is
         * 1-based, 0 is none. It was a 0-based index, and one document pill
         * driving both siblings was off by one on one of them. Saved values
         * shift so the same option stays chosen; an absent `which` meant the
         * first option and still does.
         */
        if (child.type === 'data-choice') {
          const config = child.config as { which?: number } | undefined;

          if (config && typeof config.which === 'number') {
            config.which += 1;
          }
        }

        /*
         * random-numbers carried its settings panel's SLIDER BOUNDS in the
         * flow file — four numbers describing a form, beside four describing
         * the node. The bounds live in the panel now; the file keeps only
         * behaviour.
         */
        if (child.type === 'random-numbers' && child.config) {
          const config = child.config as Record<string, unknown>;

          delete config['min'];
          delete config['max'];
          delete config['intervalMin'];
          delete config['intervalMax'];
        }

        // A typo that shipped: the stats node's min output was named
        // "Min valuex", and a saved flow carries its sockets verbatim.
        if (child.type === 'stats') {
          for (const socket of child.sockets ?? []) {
            if (socket.name === 'Min valuex') {
              socket.name = 'Min value';
            }
          }
        }
      }

      (node.children ?? []).forEach(migrate);

      return node;
    };

    return migrate(flow);
  },
};

/** The highest id anywhere in a flow — nodes, sockets and connections alike. */
function highestId(flow: FbNodeState): number {
  let highest = 0;

  const walk = (node: FbNodeState): void => {
    highest = Math.max(highest, node.id ?? 0);
    (node.sockets ?? []).forEach(socket => (highest = Math.max(highest, socket.id ?? 0)));
    (node.connections ?? []).forEach(c => (highest = Math.max(highest, c.id ?? 0)));
    (node.children ?? []).forEach(walk);
  };

  walk(flow);

  return highest;
}

export function serializeFlow(flow: FbNodeState): FbSerializedFlow {
  return { version: FB_FLOW_FORMAT_VERSION, flow: structuredClone(flow) };
}

export function serializeFlowToJson(flow: FbNodeState, pretty = true): string {
  return JSON.stringify(serializeFlow(flow), null, pretty ? 2 : undefined);
}

/**
 * Read a persisted flow, migrating it forward if needed.
 *
 * Accepts both the versioned envelope and a bare FbNodeState, which is what every
 * file written before this existed looks like.
 */
export function deserializeFlow(input: unknown): FbNodeState {
  if (input === null || typeof input !== 'object') {
    throw new FbFlowFormatError('Flow must be an object.');
  }

  const record = input as Record<string, unknown>;
  const envelope = typeof record['version'] === 'number' && typeof record['flow'] === 'object';

  // States a version but carries no `flow`: it means to be an envelope and is
  // broken. Read as a bare v1 flow it was silently re-migrated from scratch,
  // mangling a file the reader expected to open as-is.
  if (typeof record['version'] === 'number' && typeof record['flow'] !== 'object') {
    throw new FbFlowFormatError('Flow states a version but has no `flow` object.');
  }

  /*
   * A bare flow — no envelope — is a file from before versioning existed,
   * which makes it format 1 BY DEFINITION. It used to be read as the current
   * version, which skipped every migration for exactly the files migrations
   * exist for.
   */
  let version = envelope ? (record['version'] as number) : 1;
  let flow = (envelope ? record['flow'] : record) as FbNodeState;

  if (!Number.isInteger(version) || version < 1) {
    throw new FbFlowFormatError(`Unsupported flow version: ${String(version)}`);
  }

  if (version > FB_FLOW_FORMAT_VERSION) {
    throw new FbFlowFormatError(
      `Flow was saved by a newer version of the library (format ${version}, this build reads ${FB_FLOW_FORMAT_VERSION}).`,
    );
  }

  assertFlowShape(flow);

  flow = structuredClone(flow);

  while (version < FB_FLOW_FORMAT_VERSION) {
    const migrate = MIGRATIONS[version];

    /*
     * No script means no shape change between these versions: the file is
     * compatible as it stands, and the number alone moves on. Refusing here —
     * which is what this did — would turn a bumped version constant into a
     * reader that rejects its own old files for no structural reason.
     */
    flow = migrate ? migrate(flow) : flow;
    version++;
  }

  return flow;
}

export function deserializeFlowFromJson(json: string): FbNodeState {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new FbFlowFormatError(`Flow is not valid JSON: ${(err as Error).message}`);
  }

  return deserializeFlow(parsed);
}

/**
 * Enough validation to fail with a useful message instead of a TypeError from
 * somewhere inside the engine. Deliberately shallow: this checks the structure
 * the engine indexes on, not every optional field.
 */
function assertFlowShape(flow: FbNodeState, path = 'flow'): void {
  if (flow === null || typeof flow !== 'object') {
    throw new FbFlowFormatError(`${path} must be an object.`);
  }

  if (typeof flow.type !== 'string' || flow.type === '') {
    throw new FbFlowFormatError(`${path}.type must be a non-empty string.`);
  }

  // Ids must be NUMBERS. The engine keys `workers[id]` and `sockets[id]` by
  // them, so a string id like "__proto__" or "constructor" wrote through the
  // registry's prototype — a poisoned, undestroyable worker from a flow's own
  // JSON. A missing id is allowed (the editor assigns one); a present one must
  // be a number.
  if (flow.id !== undefined && typeof flow.id !== 'number') {
    throw new FbFlowFormatError(`${path}.id must be a number when present.`);
  }

  if (flow.sockets !== undefined && !Array.isArray(flow.sockets)) {
    throw new FbFlowFormatError(`${path}.sockets must be an array when present.`);
  }

  (flow.sockets ?? []).forEach((socket, i) => {
    if (socket?.id !== undefined && typeof socket.id !== 'number') {
      throw new FbFlowFormatError(`${path}.sockets[${i}].id must be a number when present.`);
    }
  });

  if (flow.connections !== undefined) {
    if (!Array.isArray(flow.connections)) {
      throw new FbFlowFormatError(`${path}.connections must be an array when present.`);
    }

    flow.connections.forEach((connection, i) => {
      if (typeof connection?.id !== 'number') {
        throw new FbFlowFormatError(`${path}.connections[${i}].id must be a number.`);
      }
    });
  }

  if (flow.children !== undefined) {
    if (!Array.isArray(flow.children)) {
      throw new FbFlowFormatError(`${path}.children must be an array when present.`);
    }

    flow.children.forEach((child, i) => assertFlowShape(child, `${path}.children[${i}]`));
  }
}
