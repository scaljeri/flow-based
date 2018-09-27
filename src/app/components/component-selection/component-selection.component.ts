import { Component, Inject, OnInit } from '@angular/core';
import { XXL_FLOW_TYPES, XXL_FLOW_UNIT_TYPES, XxlTypes } from 'flow-based';
import { ComponentSelectionService } from '../../component-selection.service';

@Component({
  selector: 'fb-component-selection',
  templateUrl: './component-selection.component.html',
  styleUrls: ['./component-selection.component.scss']
})
export class ComponentSelectionComponent implements OnInit {
  flowKeys: string[];
  unitKeys: string[];

  constructor(private selectionService: ComponentSelectionService,
              @Inject(XXL_FLOW_UNIT_TYPES) public flowUnitTypes: XxlTypes,
              @Inject(XXL_FLOW_TYPES) public flowTypes: XxlTypes) {
  }

  ngOnInit() {
    this.unitKeys = Object.keys(this.flowUnitTypes);
    this.flowKeys = Object.keys(this.flowTypes);
  }

  onSelection(type: string, isFlow = false): void {
    this.selectionService.select({type, isFlow});
  }

}
