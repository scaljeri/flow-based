import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';

@Component({
  selector: 'fb-default-front',
  templateUrl: './default-front.component.html',
  styleUrls: ['./default-front.component.scss']
})
export class DefaultFrontComponent implements OnInit {
  @Input() title: string;
  @ViewChild('img') ref: ElementRef;

  constructor(private fbService: XxlFlowUnitService) {}

  ngOnInit(): void {
    this.ref.nativeElement.addEventListener('load', () => {
      this.fbService.calibrate();
    });
  }
}
