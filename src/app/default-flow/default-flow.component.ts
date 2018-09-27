import { Component, Input, OnInit } from '@angular/core';
import { XxlFlowUnit, XxlSocket } from 'flow-based';

@Component({
  selector: 'fb-default-flow',
  templateUrl: './default-flow.component.html',
  styleUrls: ['./default-flow.component.scss']
})
export class DefaultFlowComponent implements XxlFlowUnit, OnInit {
  @Input() title: string;

  constructor() { }

  ngOnInit() {
  }

  getSockets(): XxlSocket[] {
    return [];
  }

  setActive(boolean): void {
  }
}
