import { FbNodeState } from './types';

/**
 * A flow rendered as a document.
 *
 * The JSON is the thing; the node editor is one representation of it and this is
 * another. A document is an ordered list of blocks, where a `node` block embeds
 * that node's own visual output as a figure — the same canvas the editor draws,
 * with prose around it rather than connections.
 */
export interface FbDocument {
  title?: string;
  blocks: FbDocBlock[];
}

export type FbDocBlock = FbDocHeadingBlock | FbDocTextBlock | FbDocNodeBlock;

export interface FbDocHeadingBlock {
  type: 'heading';
  text: string;
  /** 1–6; defaults to 2. */
  level?: number;
}

export interface FbDocTextBlock {
  type: 'text';
  /** Plain text. Blank lines separate paragraphs. */
  text: string;
}

export interface FbDocNodeBlock {
  type: 'node';
  nodeId: number;
  float?: 'left' | 'right' | 'none';
  /** Any CSS length, e.g. '320px' or '40%'. */
  width?: string;
  caption?: string;
  /**
   * Whether this figure holds the top of a narrow screen while its own part
   * of the page is read. Defaults to true, which is what a figure usually
   * wants: the picture and the sentence that changes it, together.
   *
   * `false` is the way out for a figure that is not worth a screen of its own
   * — a short list, a single knob. It arrives as ordinary content and shoves
   * whatever was pinned off the top on its way past, so the reader gets the
   * page back rather than a held-open box with nothing in it.
   */
  pin?: boolean;
}

/**
 * The document for a flow, falling back to one derived from the graph.
 *
 * Deriving matters: every flow written before documents existed has no `document`
 * field, and those should still render as something worth reading rather than a
 * blank page. The derived form is the flow's own title, each node's prose if it
 * has any, and each node as a figure — alternating sides so the text wraps around
 * them, which is what the layout is for.
 */
export function documentFor(flow: FbNodeState): FbDocument {
  if (flow.document && flow.document.blocks.length) {
    return flow.document;
  }

  const blocks: FbDocBlock[] = [];
  const children = flow.children ?? [];

  // Only nodes WITH prose get a floated figure: a float with no text beside it
  // has nothing to wrap around, and the headings end up colliding with it.
  // Sides alternate across those, so the page reads down the middle.
  let floated = 0;

  children.forEach(node => {
    if (node.id === undefined) {
      return;
    }

    const body = node.doc?.body;

    if (node.title) {
      blocks.push({ type: 'heading', text: node.title, level: 2 });
    }

    blocks.push({
      type: 'node',
      nodeId: node.id,
      float: body ? (floated++ % 2 === 0 ? 'right' : 'left') : 'none',
      caption: node.doc?.figure?.caption ?? node.title,
      width: node.doc?.figure?.width,
    });

    if (body) {
      blocks.push({ type: 'text', text: body });
    }
  });

  return { title: flow.title ?? 'Flow', blocks };
}

/** Split a text block into paragraphs on blank lines. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

/*
 * Dotted-path access into a node's config, for the document's inline inputs.
 *
 * The names come out of document JSON, which may not be the reader's own file —
 * so the segments an object is walked by are checked against the prototype
 * escape hatches. Everything else is fair game: the paths address exactly what
 * the node's own settings panel edits.
 */
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function segmentsOf(path: string): string[] | null {
  const segments = path.split('.');

  return segments.some(segment => !segment || FORBIDDEN_SEGMENTS.has(segment))
    ? null
    : segments;
}

/** The value at a dotted path, or undefined anywhere along a missing branch. */
export function readConfigValue(config: unknown, path: string): unknown {
  const segments = segmentsOf(path);

  if (!segments) {
    return undefined;
  }

  let current: unknown = config;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Write a value at a dotted path, creating the branch as needed.
 *
 * In PLACE, deliberately: the engine hands a worker its node's config object —
 * the same one the JSON serialises — so mutating it is what persists (see the
 * workers' own convention). Returns false when the path is unwritable.
 */
export function writeConfigValue(config: Record<string, unknown>, path: string, value: unknown): boolean {
  const segments = segmentsOf(path);

  if (!segments) {
    return false;
  }

  let current = config;

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];

    if (next === null || typeof next !== 'object') {
      if (next !== undefined) {
        return false;
      }

      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;

  return true;
}
