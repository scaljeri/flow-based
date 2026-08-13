import { Component, OnInit, inject } from '@angular/core';
import { FB_NODE_TYPES, FbNodeTypes } from '@scaljeri/flow-based';
import { ComponentSelectionService } from '../../component-selection.service';
import { ModulesService } from '../../modules.service';

interface PaletteGroup {
  name: string;
  keys: string[];
}

@Component({
  standalone: false,
  selector: 'fb-component-selection',
  templateUrl: './component-selection.component.html',
  styleUrls: ['./component-selection.component.scss']
})
export class ComponentSelectionComponent implements OnInit {
  private selectionService = inject(ComponentSelectionService);
  private modules = inject(ModulesService);
  flowTypes = inject<FbNodeTypes>(FB_NODE_TYPES);

  groups: PaletteGroup[] = [];
  query = '';
  /** The type whose explanation is showing, or null when none is. */
  helpFor: string | null = null;

  ngOnInit() {
    this.rebuild();
    // A module enabled while the palette is open adds its group live.
    this.modules.changed.subscribe(() => this.rebuild());
  }

  title(key: string): string {
    return this.flowTypes[key].settings.title;
  }

  /**
   * The label a palette row shows: the title, plus the GROUP when another type
   * wears the same title. Two rows both reading "Compare" (the general one and
   * a module's own) were indistinguishable — same word, disjoint behaviour —
   * and the type key is deliberately not shown here.
   */
  label(key: string): string {
    const title = this.title(key);
    const twin = Object.keys(this.flowTypes)
      .some(other => other !== key && this.flowTypes[other].settings.title === title);

    return twin ? `${title} (${this.flowTypes[key].settings.group ?? 'General'})` : title;
  }

  /** The type's explanation, or a note that none is written. */
  helpText(key: string): string {
    return this.flowTypes[key].settings.help ?? 'No explanation written for this node yet.';
  }

  /** Whether this type has settings of its own, worth telling a reader how to reach. */
  hasConfig(key: string): boolean {
    return !!this.flowTypes[key].settingsComponent;
  }

  /** The `i`: show the node's explanation without adding it. */
  onInfo(key: string, event: Event): void {
    // Not a selection: the press must not fall through to the row's Add.
    event.stopPropagation();
    this.helpFor = key;
  }

  /** Matches the visible title as well as the registry key (e.g. 'random-numbers'). */
  onQuery(query: string): void {
    this.query = query;
    this.rebuild();
  }

  onSelection(type: string): void {
    this.selectionService.select(type);
  }

  onClose(): void {
    this.selectionService.close();
  }

  /** Enter picks the only remaining match, so search-then-Enter adds a node. */
  onEnter(): void {
    const keys = this.groups.flatMap(group => group.keys);

    if (keys.length === 1) {
      this.onSelection(keys[0]);
    }
  }

  /**
   * The list, grouped by each type's `settings.group`.
   *
   * Ungrouped types come first under 'General' — they are the original set and
   * the ones a first-time user goes looking for — and the named groups follow
   * alphabetically. The search spans all of it; a group with no match is not
   * shown at all rather than shown empty.
   */
  private rebuild(): void {
    const needle = this.query.trim().toLowerCase();
    const byGroup = new Map<string, string[]>();

    const keys = Object.keys(this.flowTypes)
      .sort((a, b) => this.title(a).localeCompare(this.title(b)))
      .filter(key => !needle || `${this.title(key)} ${key}`.toLowerCase().includes(needle));

    for (const key of keys) {
      const group = this.flowTypes[key].settings.group ?? 'General';

      byGroup.set(group, [...(byGroup.get(group) ?? []), key]);
    }

    this.groups = [...byGroup.entries()]
      .map(([name, groupKeys]) => ({ name, keys: groupKeys }))
      .sort((a, b) => (a.name === 'General' ? -1 : b.name === 'General' ? 1 : a.name.localeCompare(b.name)));
  }

  get empty(): boolean {
    return this.groups.length === 0;
  }
}
