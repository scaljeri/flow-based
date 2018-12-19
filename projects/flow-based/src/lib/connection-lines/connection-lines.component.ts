import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter, Inject,
  Input,
  OnChanges,
  OnInit, Optional,
  Output, SimpleChanges
} from '@angular/core';
import { FB_SOCKET_COLORS, FbSocketColors, XxlConnection, XxlPosition } from '../flow-based';
import * as bezier from './bezier';
import { SocketService } from '../socket.service';

@Component({
  selector: 'xxl-connection-lines',
  templateUrl: './connection-lines.component.html',
  styleUrls: ['./connection-lines.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionLinesComponent implements OnInit, OnChanges {
  @Input() connections: XxlConnection[];
  @Input() from: number;
  @Input() to: number;

  @Input() set pointerMoved(event: PointerEvent) {
    if (event) {
      this.pointer = {x: event.pageX, y: event.pageY};
    } else {
      this.pointer = null;
    }
  }

  @Output() lineClick = new EventEmitter<XxlConnection>();

  pointer: XxlPosition | null;
  controlPoints: { [key: number]: XxlPosition[] } = {};
  lines: string[] = [];
  private rect;

  constructor(private element: ElementRef,
              private viewRef: ChangeDetectorRef,
              private socketService: SocketService,
              @Optional() @Inject(FB_SOCKET_COLORS) private colors: FbSocketColors) {
  }

  ngOnInit() {
    this.rect = this.element.nativeElement.getBoundingClientRect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.connection) {
      this.rect = this.element.nativeElement.getBoundingClientRect();
      this.controlPoints = [];
    } else {
      if (!this.to && !this.from) {
        this.pointer = null;
      }
    }
  }

  onClick(event: PointerEvent, connection: XxlConnection): void {
    event.stopPropagation();
    this.lineClick.next(connection);
  }

  pointerPath(): string {
    const start = this.socketService.getSocket(this.from || this.to).comp.position;
    let output = '';

    if (this.from && this.pointer) {
      output = this.computeD(0,
        start.x - this.rect.left, start.y - this.rect.top,
        this.pointer.x - this.rect.left, this.pointer.y - this.rect.top);
    } else if (this.to && this.pointer) {
      output = this.computeD(0,
        this.pointer.x - this.rect.left, this.pointer.y - this.rect.top,
        start.x - this.rect.left, start.y - this.rect.top);
    }

    return output;
  }

  pointerColor(): string {
    const socket = this.socketService.getSocket(this.from || this.to).comp.state;

    return socket.color || (this.colors && this.colors[socket.format!]) || '#fff';
  }

  stopColorStart(connId): string {
    const socketDetails = this.socketService.getSocket(connId);

    if (!socketDetails) {
      return '#ffffff';
    }

    return socketDetails.comp.state.color || this.colors[socketDetails.comp.state.format!] || '#fff';
  }

  stopColorEnd(connId): string {
    return this.stopColorStart(connId);
  }

  d(connection: XxlConnection): string {
    let cx1, cx2, cy1, cy2;

    if (typeof connection.from === 'object') {
      return this.dFromElements(connection);
    } else {

      const start = this.socketService.getSocket(connection.out!).comp.position;
      const end = (this.socketService.getSocket(connection.in!) || {comp: {position: start}} as any).comp.position;

      if (!start || !start.x || !end || !end.x) {
        return '';
      }

      const x1 = start.x - this.rect.left;
      const y1 = start.y - this.rect.top;
      const x2 = end.x - this.rect.left;
      const y2 = end.y - this.rect.top;

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

  dFromElements(connection: XxlConnection): string {
    const fromRect = (connection.from as HTMLElement).getBoundingClientRect(),
      toRect = (connection.to as HTMLElement).getBoundingClientRect();

    const x1 = fromRect.left - this.rect.left + fromRect.width / 2;
    const y1 = fromRect.top - this.rect.top + fromRect.height / 2;

    const x2 = toRect.left - this.rect.left + toRect.width / 2;
    const y2 = toRect.top - this.rect.top + toRect.height / 2;

    return this.computeD(connection.id, x1, y1, x2, y2);
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

  private valuesToD(x1, y1, x2, y2, cx1, cy1, cx2, cy2): string {
    return `M ${x1} ${y1 - .0001} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
  }

  arrow(connection: XxlConnection): string {
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
