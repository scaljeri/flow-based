import { Component, Inject, OnInit } from '@angular/core';
import { XXL_FLOW_ENTRY } from '../../flow-based.component';

@Component({
  selector: 'xxl-dummy',
  templateUrl: './dummy.component.html',
  styleUrls: ['./dummy.component.scss']
})
export class DummyComponent implements OnInit {
  state: any;

  constructor(@Inject(XXL_FLOW_ENTRY) state: any) {
    this.state =  state;
  }

  ngOnInit() {
  }

}
