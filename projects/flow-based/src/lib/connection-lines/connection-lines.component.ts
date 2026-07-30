import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter, Inject,
  Input,
  OnChanges,
  Optional,
  Output, SimpleChanges
} from '@angular/core';
import {
  FB_SOCKET_COLORS,
  FbAnyConnection,
  FbElementConnection,
  FbPosition,
  FbSocketColors,
  isElementConnection,
} from '../flow-based';
import * as bezier from '@scaljeri/flow-based-core';
import { SocketService } from '../socket.service';
import { FbViewportService } from '../viewport/viewport.service';
import { FbGraphSignals } from '../graph-signals.service';

@Component({
  selector: 'fb-connection-lines',
  templateUrl: './connection-lines.component.html',
  styleUrls: ['./connection-lines.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ConnectionLinesComponent implements OnChanges {
  /*
   * Draws both kinds of line: graph edges (FbConnection, socket to socket) and
   * the element-to-element lines a node type may render internally
   * (FbElementConnection). Defaulted rather than asserted because
   * `FbNodeState.connections` is optional.
   */
  @Input() connections: FbAnyConnection[] = [];
  @Input() from: number | null = null;
  @Input() to: number | null = null;

  @Input() set pointerMoved(event: PointerEvent) {
    if (event) {
      // clientX/clientY, not pageX/pageY: socket positions come from
      // getBoundingClientRect, which is client space. The two only agreed while
      // the page was unscrolled.
      this.pointer = {x: event.clientX, y: event.clientY};
    } else {
      this.pointer = null;
    }
  }

  @Output() lineClick = new EventEmitter<FbAnyConnection>();

  pointer: FbPosition | null = null;
  controlPoints: { [key: number]: FbPosition[] } = {};
  lines: string[] = [];

  constructor(private element: ElementRef,
              private viewRef: ChangeDetectorRef,
              private socketService: SocketService,
              @Optional() private viewport: FbViewportService | null,
              @Optional() private graph: FbGraphSignals | null,
              @Optional() @Inject(FB_SOCKET_COLORS) private colors: FbSocketColors | null) {
  }

  /**
   * Client-space point to this SVG's own coordinate space.
   *
   * The SVG lives inside the zoomed plane, so CSS already scales whatever is
   * drawn. Socket positions, however, come from getBoundingClientRect and are
   * therefore *already* scaled — dividing by the zoom is what stops the transform
   * being applied twice.
   *
   * The rect is re-read per call because pan and zoom move it and there is no
   * change-detection signal for that. Cheap enough at demo scale (transforms do
   * not trigger layout), and it goes away once geometry is derived from graph
   * coordinates instead of measured.
   */
  private toPlane(clientX: number, clientY: number): FbPosition {
    const rect: DOMRect = this.element.nativeElement.getBoundingClientRect();
    const zoom = this.viewport?.zoom() ?? 1;

    return {x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom};
  }

  ngOnChanges(changes: SimpleChanges): void {
    /*
     * The cached `rect` this used to maintain is gone: it was measured once in
     * ngOnInit and only re-measured in a branch guarded on `changes.connection` —
     * an input that does not exist (the input is `connections`), so the branch was
     * dead and every line rendered offset from its sockets once the SVG moved
     * (docs/AUDIT.md §3.5). toPlane() now reads the rect where it is used, which is
     * both correct under pan/zoom and impossible to leave stale.
     */
    if (changes['connections']) {
      this.controlPoints = {};
    }

    if (!this.to && !this.from) {
      this.pointer = null;
    }
  }

  onClick(event: PointerEvent, connection: FbAnyConnection): void {
    event.stopPropagation();
    this.lineClick.next(connection);
  }

  pointerPath(): string {
    this.graph?.layout();

    const anchor = this.socketService.getSocket((this.from || this.to)!);

    if (!anchor) {
      return '';
    }

    const socket = anchor.comp.position;
    let output = '';

    if (!this.pointer) {
      return output;
    }

    const start = this.toPlane(socket.x, socket.y);
    const cursor = this.toPlane(this.pointer.x, this.pointer.y);

    if (this.from) {
      output = this.computeD(0, start.x, start.y, cursor.x, cursor.y);
    } else if (this.to) {
      output = this.computeD(0, cursor.x, cursor.y, start.x, start.y);
    }

    return output;
  }

  pointerColor(): string {
    const socket = this.socketService.getSocket((this.from || this.to)!)?.comp.state;

    if (!socket) {
      return '#fff';
    }

    return socket.color || (this.colors && this.colors[socket.format!]) || '#fff';
  }

  stopColorStart(connId: number | undefined): string {
    const socketDetails = connId === undefined ? undefined : this.socketService.getSocket(connId);

    if (!socketDetails) {
      return '#ffffff';
    }

    // `colors` is @Optional(); pointerColor() already guarded it, this did not.
    return socketDetails.comp.state.color
      || (this.colors && this.colors[socketDetails.comp.state.format!])
      || '#fff';
  }

  stopColorEnd(connId: number | undefined): string {
    return this.stopColorStart(connId);
  }

  /*
   * Gradient stops, narrowing here rather than in the template: an element-to-
   * element line has no sockets to take a colour from, so it is drawn plain.
   */
  gradientFrom(connection: FbAnyConnection): string {
    return isElementConnection(connection) ? '#fff' : this.stopColorStart(connection.out);
  }

  gradientTo(connection: FbAnyConnection): string {
    return isElementConnection(connection) ? '#fff' : this.stopColorEnd(connection.in);
  }

  d(connection: FbAnyConnection): string {
    /*
     * Establish the dependency here rather than on an @Input. The parent hands us
     * the same array instance every time — that is the point of dropping the
     * `[...spread]` identity tricks — so an unchanged reference would never mark
     * this OnPush view dirty. Reading the signal during template evaluation does.
     */
    this.graph?.layout();

    let cx1, cx2, cy1, cy2;

    // Narrowed via a type guard, so neither branch needs a cast.
    if (isElementConnection(connection)) {
      return this.dFromElements(connection);
    } else {

      // The `in` socket was guarded with a fallback but the `out` socket was
      // dereferenced directly, so a socket not yet registered threw during load.
      const startDetails = this.socketService.getSocket(connection.out!);

      if (!startDetails) {
        return '';
      }

      const start = startDetails.comp.position;
      const end = (this.socketService.getSocket(connection.in!) ?? startDetails).comp.position;

      if (!start || !start.x || !end || !end.x) {
        return '';
      }

      const p1 = this.toPlane(start.x, start.y);
      const p2 = this.toPlane(end.x, end.y);
      const x1 = p1.x;
      const y1 = p1.y;
      const x2 = p2.x;
      const y2 = p2.y;

      cx1 = Math.round(x1 + Math.abs(x1 - x2) / 2);
      cx2 = Math.round(x2 - Math.abs(x1 - x2) / 2);
      cy1 = y1;
      cy2 = y2;

      if (x2 < x1) {
        cy1 = y1 + (y2 - y1) / 2;
        cy2 = y2 - (y2 - y1) / 2;
      }

      this.controlPoints[connection.id] = [
        {x: x1, y: y1},
        {x: cx1, y: cy1},
        {x: cx2, y: cy2},
        {x: x2, y: y2},
      ];

      return this.valuesToD(x1, y1, x2, y2, cx1, cy1, cx2, cy2);
    }
  }

  dFromElements(connection: FbElementConnection): string {
    const fromRect = connection.from.getBoundingClientRect(),
      toRect = connection.to.getBoundingClientRect();

    const from = this.toPlane(fromRect.left + fromRect.width / 2, fromRect.top + fromRect.height / 2);
    const to = this.toPlane(toRect.left + toRect.width / 2, toRect.top + toRect.height / 2);

    return this.computeD(connection.id, from.x, from.y, to.x, to.y);
  }

  private computeD(id: number, fromX: number, fromY: number, toX: number, toY: number): string {
    const cx1 = Math.round(fromX + Math.abs(fromX - toX) / 2),
      cx2 = Math.round(toX - Math.abs(fromX - toX) / 2);
    let cy1 = fromY,
      cy2 = toY;

    if (toX < fromX) {
      cy1 = fromY + (toY - fromY) / 2;
      cy2 = toY - (toY - fromY) / 2;
    }

    this.controlPoints[id] = [
      {x: fromX, y: fromY},
      {x: cx1, y: cy1},
      {x: cx2, y: cy2},
      {x: toX, y: toY},
    ];

    return this.valuesToD(fromX, fromY, toX, toY, cx1, cy1, cx2, cy2);
  }

  private valuesToD(x1: number, y1: number, x2: number, y2: number,
                    cx1: number, cy1: number, cx2: number, cy2: number): string {
    return `M ${x1} ${y1 - .0001} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
  }

  arrow(connection: FbAnyConnection): string {
    const points = this.controlPoints[connection.id];

    if (!points) {
      return '';
    }

    const {x, y} = bezier.normal(.5, points);
    const der = bezier.derivative(.5, points);

    const grad = bezier.gradient(der);

    let deg = Math.atan(grad) * 180 / Math.PI;

    if (der.x < 0) {
      deg += 180;
    }

    return `translate(${x}, ${y}) rotate(${deg})`;
  }
}
