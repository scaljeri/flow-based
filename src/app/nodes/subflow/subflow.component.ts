import { Component, inject } from '@angular/core';
import { FbNodeState, NodeService } from '@scaljeri/flow-based';

/** A child reduced to what a picture of a graph needs: a box and where it sits. */
interface Dot {
  x: number;
  y: number;
  title: string;
}

/** A drawn edge between two of those boxes. */
interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * A subflow that is not showing one of its own nodes: a picture of itself.
 *
 * A subflow can be told to wear one child's face — `config.preview` names it,
 * and the shell then draws that node's own small view here instead of this.
 * Unchosen, the honest thing to show is the shape of what is inside: how many
 * nodes, roughly where, and how they hang together. It says "this is a graph,
 * and this is how big a graph" without pretending to be readable.
 *
 * Deliberately static and read-only. Everything here is `pointer-events: none`
 * — the node is the handle, and a miniature you could accidentally interact
 * with would be a second, worse editor.
 */
@Component({
  standalone: false,
  selector: 'fb-subflow',
  template: `
    @if (dots.length) {
      <svg [attr.viewBox]="'0 0 100 100'" preserveAspectRatio="none" aria-hidden="true">
        @for (edge of edges; track $index) {
          <line class="edge" [attr.x1]="edge.x1" [attr.y1]="edge.y1"
                [attr.x2]="edge.x2" [attr.y2]="edge.y2"></line>
        }

        @for (dot of dots; track $index) {
          <rect class="dot" [attr.x]="dot.x - 5" [attr.y]="dot.y - 3" width="10" height="6" rx="2">
            <title>{{dot.title}}</title>
          </rect>
        }
      </svg>

      <span class="count">{{dots.length}} nodes</span>
    } @else {
      <img alt="" src="./assets/config.svg">
    }
  `,
  styles: [`
    :host {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 92px;
      padding: 8px;
      width: 120px;
    }

    /*
     * The node is the handle. A picture that swallowed the press would make
     * the one part of this node big enough to grab the one part you cannot
     * drag it by.
     */
    svg, img {
      pointer-events: none;
    }

    svg {
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .edge {
      stroke: rgba(255, 255, 255, 0.25);
      stroke-width: 0.8;
    }

    .dot {
      fill: rgba(255, 255, 255, 0.55);
    }

    .count {
      color: #fff;
      font: 10px system-ui, sans-serif;
      opacity: 0.6;
      text-align: center;
    }

    img {
      width: 100%;
    }
  `]
})
export class SubflowComponent {
  private readonly service = inject(NodeService);

  /*
   * Read on demand rather than cached at mount. A subflow's own worker bridges
   * its sockets and says nothing at all about its children, so there is no
   * stream to subscribe to — and the graph inside changes while the reader is
   * INSIDE it, by which time this drawing does not exist. Recomputing costs
   * one pass over the children when Angular checks this node.
   */
  get dots(): Dot[] {
    return this.picture.dots;
  }

  get edges(): Edge[] {
    return this.picture.edges;
  }

  /**
   * The children, squeezed into the box.
   *
   * Positions are percentages of the plane, and a flow rarely uses all of it —
   * so they are normalised against the extent actually occupied. A graph in
   * one corner would otherwise draw as three dots in a corner of a mostly
   * empty picture, which says less than it could.
   */
  private get picture(): { dots: Dot[]; edges: Edge[] } {
    const children = (this.service.state.children ?? []) as FbNodeState[];
    const at = new Map<number, { x: number; y: number }>();

    if (!children.length) {
      return { dots: [], edges: [] };
    }

    const xs = children.map(child => child.ui?.position?.x ?? 0);
    const ys = children.map(child => child.ui?.position?.y ?? 0);
    const spread = (values: number[]) => {
      const min = Math.min(...values);
      const max = Math.max(...values);

      // A single node, or a column of them, has no extent on that axis; a
      // divisor of zero would put every dot at the same edge.
      return { min, size: max - min || 1 };
    };

    const x = spread(xs);
    const y = spread(ys);
    const place = (child: FbNodeState) => ({
      // 8% of margin each side, so the boxes are not clipped by the viewBox.
      x: 8 + (((child.ui?.position?.x ?? 0) - x.min) / x.size) * 84,
      y: 8 + (((child.ui?.position?.y ?? 0) - y.min) / y.size) * 84,
    });

    const dots = children.map(child => {
      const spot = place(child);

      at.set(child.id!, spot);

      return { ...spot, title: child.title ?? child.type };
    });

    const edges = (this.service.state.connections ?? [])
      .map(connection => ({ from: at.get(connection.from), to: at.get(connection.to) }))
      .filter((edge): edge is { from: { x: number; y: number }; to: { x: number; y: number } } =>
        !!edge.from && !!edge.to)
      .map(edge => ({ x1: edge.from.x, y1: edge.from.y, x2: edge.to.x, y2: edge.to.y }));

    return { dots, edges };
  }
}
