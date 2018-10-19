import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter, HostListener,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { XxlConnection, XxlFlowUnitState, XxlPosition } from '../flow-based';
import { Observable } from 'rxjs';
import * as bezier from './bezier';
import { FlowBasedSocketService } from '../services/flow-based-socket.service';

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

  pointer: XxlPosition;
  controlPoints: { [key: number]: XxlPosition[] } = {};
  lines: string[] = [];
  private rect;

  constructor(private element: ElementRef,
              private viewRef: ChangeDetectorRef,
              private socketService: FlowBasedSocketService) {
  }

  ngOnInit() {
    // this.socketService.movement.subscribe(fromTo => {
    // });

    // this.updates.subscribe((unitId: string) => {
    //   console.log('update it', this.socketService.units[unitId]);
    //
    // });
  }

  ngOnChanges(): void {
    this.rect = this.element.nativeElement.getBoundingClientRect();
    this.controlPoints = [];
  }

  onClick(connection: XxlConnection): void {
    this.lineClick.next(connection);
  }

  pointerPath(): string {
    const start = this.socketService.getSocketPosition(this.from || this.to);
    let output = '';

    if (this.from) {
      output = this.computeD(0,
        start.x - this.rect.left, start.y - this.rect.top,
        this.pointer.x - this.rect.left, this.pointer.y - this.rect.top);
    } else if (this.to) {
      output = this.computeD(0,
        this.pointer.x - this.rect.left, this.pointer.y - this.rect.top,
        start.x - this.rect.left, start.y - this.rect.top);
    }

    return output;
  }

  d(connection: XxlConnection): string {
    let cx1, cx2, cy1, cy2;

    if (!this.socketService) {
      return;
    }

    if (typeof connection.from === 'object') {
      return this.dFromElements(connection);
    } else {

      const start = this.socketService.getSocketPosition(connection.out);
      const end = this.socketService.getSocketPosition(connection.in) || start;

      if (!start || !start.x || !end || !end.x) {
        return;
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

      return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
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

    return `M ${fromX} ${fromY} C ${cx1} ${cy1} ${cx2} ${cy2} ${toX} ${toY}`;
  }

  arrow(connection: XxlConnection): string {
    const points = this.controlPoints[connection.id];

    if (!points) {
      return;
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
