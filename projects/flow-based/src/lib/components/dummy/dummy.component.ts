import { Component, Inject, OnInit } from '@angular/core';
import { XXL_STATE, XxlFlowUnit } from '../../flow-based';

@Component({
  selector: 'xxl-dummy',
  templateUrl: './dummy.component.html',
  styleUrls: ['./dummy.component.scss']
})
export class DummyComponent implements OnInit {
  state: any;

  constructor(@Inject(XXL_STATE) state: XxlFlowUnit) {
    this.state =  state;
  }

  ngOnInit() {
  }
}
