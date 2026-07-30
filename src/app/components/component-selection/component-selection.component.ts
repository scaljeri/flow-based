import { Component, Inject, OnInit } from '@angular/core';
import { FB_NODE_TYPES, FbNodeTypes } from '@scaljeri/flow-based';
import { ComponentSelectionService } from '../../component-selection.service';

@Component({
  standalone: false,
  selector: 'fb-component-selection',
  templateUrl: './component-selection.component.html',
  styleUrls: ['./component-selection.component.scss']
})
export class ComponentSelectionComponent implements OnInit {
  flowKeys: string[] = [];

  constructor(private selectionService: ComponentSelectionService,
              @Inject(FB_NODE_TYPES) public flowTypes: FbNodeTypes) {
  }

  ngOnInit() {
    this.flowKeys = Object.keys(this.flowTypes);
  }

  onSelection(type: string): void {
    this.selectionService.select(type);
  }

}
