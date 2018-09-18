import { Component, Input, OnInit } from '@angular/core';
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

  lines: string[] = [];

  constructor(private unitService: FlowUnitService) {
  }

  ngOnInit() {
    this.unitService.movement.subscribe(fromTo => {
      console.log('in ines');
    });

    this.updates.subscribe((unitId: string) => {
      console.log('update it', this.unitService.units[unitId]);

    });
  }

  update(state: XxlFlowUnitState) {

  }

  d(connection: XxlConnection): string {
    const from = this.unitService.units[connection.from];
    const to = this.unitService.units[connection.to];

    const start = from.getSocketPosition(connection.out);
    const end = to.getSocketPosition(connection.in);

    return `M ${start.x} ${start.y -50} L ${end.x} ${end.y -50 }`;
  }
}
