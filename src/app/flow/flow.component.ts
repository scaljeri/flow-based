import { Component, Input, OnInit } from '@angular/core';
import { XxlFlow } from '../../../projects/flow-based/src/lib/flow-based';

@Component({
  selector: 'fb-flow',
  templateUrl: './flow.component.html',
  styleUrls: ['./flow.component.scss'],
  providers: []
})
export class FlowComponent implements OnInit {
  @Input() flow: XxlFlow;

  constructor() { }

  ngOnInit() {}
}
