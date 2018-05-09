import { Component, ElementRef, OnInit } from '@angular/core';

@Component({
  selector: 'xxl-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit {

  constructor(private element: ElementRef) { }

  ngOnInit() {
  }

}
