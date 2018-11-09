import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';

@Component({
  selector: 'fb-default-front',
  templateUrl: './default-front.component.html',
  styleUrls: ['./default-front.component.scss']
})
export class DefaultFrontComponent implements OnInit {
  @Input() title: string;
  @ViewChild('img') ref: ElementRef;

  constructor(private fbService: NodeService) {}

  ngOnInit(): void {
    this.ref.nativeElement.addEventListener('load', () => {
      this.fbService.calibrate();
    });
  }
}
