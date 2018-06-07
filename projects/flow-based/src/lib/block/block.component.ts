import { Component, ElementRef, OnInit } from '@angular/core';
import { XxlFlowIN, XxlFlowOUT } from 'flow-based';

@Component({
  selector: 'xxl-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit {

  constructor(private element: ElementRef) { }

  ngOnInit() {
  }

  get socketsIn(): XxlFlowIN[] {
    return [];
  }

  get socketsOut(): XxlFlowOUT[] {
    return [];
  }
}
