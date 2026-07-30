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
  private allKeys: string[] = [];
  flowKeys: string[] = [];
  query = '';

  constructor(private selectionService: ComponentSelectionService,
              @Inject(FB_NODE_TYPES) public flowTypes: FbNodeTypes) {
  }

  ngOnInit() {
    // Sorted by the title the user actually sees, not by registry insertion order.
    this.allKeys = Object.keys(this.flowTypes)
      .sort((a, b) => this.title(a).localeCompare(this.title(b)));
    this.flowKeys = this.allKeys;
  }

  title(key: string): string {
    return this.flowTypes[key].settings.title;
  }

  /** Matches the visible title as well as the registry key (e.g. 'zoomcanvas'). */
  onQuery(query: string): void {
    this.query = query;

    const needle = query.trim().toLowerCase();

    this.flowKeys = needle
      ? this.allKeys.filter(key => `${this.title(key)} ${key}`.toLowerCase().includes(needle))
      : this.allKeys;
  }

  onSelection(type: string): void {
    this.selectionService.select(type);
  }

  /** Enter picks the only remaining match, so search-then-Enter adds a node. */
  onEnter(): void {
    if (this.flowKeys.length === 1) {
      this.onSelection(this.flowKeys[0]);
    }
  }
}
