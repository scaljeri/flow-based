import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { XxlConnection, XxlFlowUnitState } from 'flow-based';
import { Observable } from 'rxjs';
import { FlowUnitService } from '../flow-unit-service';
import { UnitWrapper } from '../utils/unit-wrapper';

@Component({
  selector: 'xxl-connection-lines',
  templateUrl: './connection-lines.component.html',
  styleUrls: ['./connection-lines.component.scss']
})
export class ConnectionLinesComponent implements OnInit {
  @Input() connections: XxlConnection[];
  @Input() updates: Observable<string>;
  @Output() click = new EventEmitter<XxlConnection>();

  lines: string[] = [];

  constructor(private unitService: FlowUnitService) {
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

  update(state: XxlFlowUnitState) {

  }

  onClick(connection: XxlConnection): void {
    console.log('xxxxxxxxxxxxxxxxx');
    this.click.next(connection);
  }

  d(connection: XxlConnection): string {
    const from = this.unitService.units[connection.from];
    const to = this.unitService.units[connection.to];

    const start = from.getSocketPosition(connection.out);
    let end = to.getSocketPosition(connection.in);

    if (end.x === null) {
      end = start;
    }

    return `M ${start.x} ${start.y - 50} L ${end.x} ${end.y - 50 }`;
  }
}
