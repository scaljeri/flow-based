import { Component, Inject, OnInit } from '@angular/core';
import { XXL_BLACK_BOX } from '../../flow-based';

@Component({
  selector: 'xxl-source',
  templateUrl: './source.component.html',
  styleUrls: ['./source.component.scss']
})
export class SourceComponent implements OnInit {
  state: any;

  constructor(@Inject(XXL_BLACK_BOX) state: any) {
   this.state =  state;
  }

  ngOnInit() {
  }

}
