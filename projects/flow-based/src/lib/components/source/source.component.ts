import { Component, Inject, OnInit } from '@angular/core';
import { XXL_FLOW_ENTRY } from '../../flow-based.component';

@Component({
  selector: 'xxl-source',
  templateUrl: './source.component.html',
  styleUrls: ['./source.component.scss']
})
export class SourceComponent implements OnInit {
  state: any;

  constructor(@Inject(XXL_FLOW_ENTRY) state: any) {
   this.state =  state;
  }

  ngOnInit() {
  }

}
