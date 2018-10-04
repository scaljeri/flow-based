import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { XxlConnection, XxlFlowUnitState } from 'flow-based';
import { Observable } from 'rxjs';
import { XxlFlowBasedService } from '../flow-based.service';

@Component({
  selector: 'xxl-connection-lines',
  templateUrl: './connection-lines.component.html',
  styleUrls: ['./connection-lines.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionLinesComponent implements OnInit, OnChanges {
  @Input() connections: XxlConnection[];
  @Input() updates: Observable<string>;
  @Output() lineClick = new EventEmitter<XxlConnection>();

  lines: string[] = [];
  private rect;

  constructor(private element: ElementRef,
              private viewRef: ChangeDetectorRef,
              private flowService: XxlFlowBasedService) {
  }

  ngOnInit() {
    // this.flowService.movement.subscribe(fromTo => {
    // });

    // this.updates.subscribe((unitId: string) => {
    //   console.log('update it', this.flowService.units[unitId]);
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
    let cx1, cx2, cy1, cy2;

    const from = this.flowService.units[connection.from];
    const to = this.flowService.units[connection.to];

    const start = from.getSocketPosition(connection.out);
    console.log(connection.to + ' en ', to);
    const end = to.getSocketPosition(connection.in) || start;

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

    const output = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;

    return output;
  }
}
