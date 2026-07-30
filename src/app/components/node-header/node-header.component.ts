import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'fb-node-header',
  templateUrl: './node-header.component.html',
  styleUrls: ['./node-header.component.scss']
})
export class NodeHeaderComponent {
  @Input() title = '';
  @Output() edit = new EventEmitter();

  onEdit(): void {
    this.edit.emit();
  }
}
