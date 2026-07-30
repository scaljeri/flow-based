import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';

@Component({
  standalone: false,
  selector: 'fb-default-front',
  templateUrl: './default-front.component.html',
  styleUrls: ['./default-front.component.scss']
})
export class DefaultFrontComponent implements OnInit {
  @Input() title = '';
  /*
   * `static: true` is required here: the query result is read in ngOnInit.
   * Under ViewEngine (Angular 7) every non-embedded view query was resolved
   * before ngOnInit ran; since Ivy only `static: true` queries are, so without
   * this flag `this.ref` would be undefined and ngOnInit would throw.
   */
  @ViewChild('img', {static: true}) ref!: ElementRef;

  constructor(private fbService: NodeService) {}

  ngOnInit(): void {
    this.ref.nativeElement.addEventListener('load', () => {
      this.fbService.calibrate();
    });
  }
}
