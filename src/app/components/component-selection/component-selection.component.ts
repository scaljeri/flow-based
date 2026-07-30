import { Component, Inject, OnInit } from '@angular/core';
import { XXL_FLOW_TYPES, FbNodeTypes } from '@scaljeri/flow-based';
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
              @Inject(XXL_FLOW_TYPES) public flowTypes: FbNodeTypes) {
  }

  ngOnInit() {
    this.flowKeys = Object.keys(this.flowTypes);
  }

  onSelection(type: string): void {
    this.selectionService.select(type);
  }

}
