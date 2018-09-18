import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { XxlConnection, XxlFlowUnitState } from 'flow-based';
import { Observable } from 'rxjs';
import { FlowUnitService } from '../flow-unit-service';
import { UnitWrapper } from '../utils/unit-wrapper';

@Component({
  selector: 'xxl-connection-lines',
  templateUrl: './connection-lines.component.html',
  styleUrls: ['./connection-lines.component.scss']
})
export class ConnectionLinesComponent implements OnInit, OnChanges {
  @Input() connections: XxlConnection[];
  @Input() updates: Observable<string>;
  @Output() lineClick = new EventEmitter<XxlConnection>();

  lines: string[] = [];
  private rect;

  constructor(private element: ElementRef,
              private unitService: FlowUnitService) {
  }

  ngOnInit() {
    this.unitService.movement.subscribe(fromTo => {
      console.log('in ines');
    });

    // this.updates.subscribe((unitId: string) => {
    //   console.log('update it', this.unitService.units[unitId]);
    //
    // });
  }

  ngOnChanges(): void {
    this.rect = this.element.nativeElement.getBoundingClientRect();
  }

  update(state: XxlFlowUnitState) {

  }

  onClick(connection: XxlConnection): void {
    this.lineClick.next(connection);
  }

  d(connection: XxlConnection): string {
    const from = this.unitService.units[connection.from];
    const to = this.unitService.units[connection.to];

    const start = from.getSocketPosition(connection.out);
    const end = to.getSocketPosition(connection.in) || start;

    const x1 = start.x - this.rect.left;
    const y1 = start.y - this.rect.top;
    const x2 = end.x - this.rect.left;
    const y2 = end.y - this.rect.top;
    const cx1 = x1 + Math.abs(x1 -  x2) / 2;
    const cy1 = y1 + Math.abs(y1 -  y2) / 2;
    const cx2 = x1 + Math.abs(x1 -  x2) / 2;
    const cy2 = y1 + Math.abs(y1 -  y2) / 2;

    return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;
  }
}
