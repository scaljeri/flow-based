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
