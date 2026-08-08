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
 */
export const FB_FLOW_FORMAT_VERSION = 3;

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
};

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

  if (flow.sockets !== undefined && !Array.isArray(flow.sockets)) {
    throw new FbFlowFormatError(`${path}.sockets must be an array when present.`);
  }

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
