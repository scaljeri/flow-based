import { Component, Directive } from '@angular/core';
import { Observable } from 'rxjs';
import { FbNoDragDirective, FbWorkerView } from '@scaljeri/flow-based';
import { COMPARE_OPS, CompareOp, CompareWorker } from './compare.worker';
import { LogicWorker } from './logic.worker';

/*
 * The condition nodes' drawings. Each is an operator picker and the last answer
 * it produced — the reading is a 0 or a 1, the whole point of these nodes. The
 * plumbing (subscribe to the worker, redraw on its changes) is FbWorkerView; this
 * adds only writing the operator back.
 */

interface ConditionWorker {
  changes: Observable<void>;
  result?: number;
  op: string;
  setConfigValue(path: string, value: unknown): void;
}

@Directive()
abstract class ConditionView<TWorker extends ConditionWorker> extends FbWorkerView<TWorker> {
  setOp(event: Event): void {
    this.worker?.setConfigValue('op', (event.target as HTMLSelectElement).value);
    this.cdr.detectChanges();
  }
}

const CONDITION_STYLES = `
  :host {
    align-items: center;
    color: #fff;
    display: flex;
    font: 12px system-ui, sans-serif;
    gap: 8px;
    justify-content: center;
    padding: 8px 10px;
  }

  select {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
    font: inherit;
    padding: 3px 6px;
  }

  select option {
    color: #000;
  }

  /* A finger needs a real target: the operator select is ~24px on a mouse,
     under every touch guideline. Only on a coarse pointer, so the desktop
     face is unchanged. */
  @media (pointer: coarse) {
    select {
      min-height: 44px;
      padding: 6px 12px;
    }
  }

  .expr {
    opacity: 0.85;
    white-space: nowrap;
  }

  .reading {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    min-width: 1ch;
    opacity: 0.9;
    text-align: center;
  }
`;

/**
 * Two numbers and an operator, out 0 or 1.
 *
 * The face READS, it does not edit: it says what is being compared, in the
 * flow's own words — the socket names, top operand first — around the chosen
 * operator. The operator select used to sit here, an editable control on a
 * node at rest; it lives in the settings panel now, where every other
 * configuration already is.
 */
@Component({
  standalone: true,
  selector: 'fb-compare-small',
  template: `
    <span class="expr">{{ nameOf('a') }} {{ symbol }} {{ nameOf('b') }}</span>
    <span class="reading">{{ worker?.result === undefined ? '—' : worker?.result }}</span>
  `,
  styles: [CONDITION_STYLES],
})
export class CompareSmallComponent extends ConditionView<CompareWorker> {
  get symbol(): string {
    return COMPARE_OPS[(this.worker?.op ?? 'gt') as CompareOp]?.symbol ?? '?';
  }

  /** The operand's name as the FLOW gave it; aux is the identity, a/b the fallback. */
  nameOf(aux: 'a' | 'b'): string {
    return this.service.state.sockets?.find(s => s.type === 'in' && s.aux === aux)?.name || aux;
  }
}

/** AND / OR / NOT over its wires, out 0 or 1. */
@Component({
  standalone: true,
  imports: [FbNoDragDirective],
  selector: 'fb-logic-small',
  template: `
    <select fbNoDrag aria-label="Operator" (change)="setOp($event)">
      <option value="and" [selected]="worker?.op === 'and'">AND</option>
      <option value="or" [selected]="worker?.op === 'or'">OR</option>
      <option value="not" [selected]="worker?.op === 'not'">NOT</option>
    </select>
    <span class="reading">{{ worker?.result === undefined ? '—' : worker?.result }}</span>
  `,
  styles: [CONDITION_STYLES],
})
export class LogicSmallComponent extends ConditionView<LogicWorker> {
}
