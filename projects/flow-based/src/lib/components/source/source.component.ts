import { Component, Inject, OnInit } from '@angular/core';
import { XXL_STATE } from '../../flow-based';

@Component({
  selector: 'xxl-source',
  templateUrl: './source.component.html',
  styleUrls: ['./source.component.scss']
})
export class SourceComponent implements OnInit {
  state: any;

  constructor(@Inject(XXL_STATE) state: any) {
   this.state =  state;
  }

  ngOnInit() {
  }

}
