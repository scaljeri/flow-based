import { Component, Input } from '@angular/core';

@Component({
  selector: 'fb-default-front',
  templateUrl: './default-front.component.html',
  styleUrls: ['./default-front.component.scss']
})
export class DefaultFrontComponent {
  @Input() title: string;
}
