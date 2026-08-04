import { FbNodeState } from './types';

/**
 * Version of the persisted flow format.
 *
 * 1 — the shape the project has always written: a recursive FbNodeState with
 *     `position` as percentages of the graph plane. Files saved before versioning
 *     existed carry no `version` field and are read as 1, because the shape did
 *     not change when the viewport was introduced (see FbViewportService).
 * 2 — the view names `medium` and `large` became `normal` and `full`. Readers
 *     translated the old names at runtime; the file now says what it means.
 */
export const FB_FLOW_FORMAT_VERSION = 2;

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
 * A migration receives a clone and may mutate it freely.
 */
const MIGRATIONS: Record<number, (flow: FbNodeState) => FbNodeState> = {
  /* 1 → 2: the view names medium/large became normal/full. */
  1: flow => {
    const renames: Record<string, string> = { medium: 'normal', large: 'full' };

    const walk = (node: FbNodeState): void => {
      const view = node.view as string | undefined;

      if (view && renames[view]) {
        node.view = renames[view] as FbNodeState['view'];
      }

      node.children?.forEach(walk);
    };

    walk(flow);

    return flow;
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

    if (!migrate) {
      throw new FbFlowFormatError(`No migration from flow format ${version} to ${version + 1}.`);
    }

    flow = migrate(flow);
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
