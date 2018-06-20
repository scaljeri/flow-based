import { Component, Inject, OnInit } from '@angular/core';
import { XXL_BLACK_BOX } from '../../flow-based';

@Component({
  selector: 'xxl-dummy',
  templateUrl: './dummy.component.html',
  styleUrls: ['./dummy.component.scss']
})
export class DummyComponent implements OnInit {
  state: any;

  constructor(@Inject(XXL_BLACK_BOX) state: any) {
    this.state =  state;
  }

  ngOnInit() {
  }
}
