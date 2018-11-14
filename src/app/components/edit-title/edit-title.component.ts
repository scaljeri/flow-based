import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FbNodeState } from '../../../../projects/flow-based/src/lib/flow-based';

@Component({
  selector: 'xxl-edit-title',
  templateUrl: './edit-title.component.html',
  styleUrls: ['./edit-title.component.scss']
})
export class EditTitleComponent implements OnInit {
  @Input() state: FbNodeState;
  @ViewChild('input') input: ElementRef;

  public hasFocus = false;
  private lastBlurred = 0;

  constructor() {
  }

  ngOnInit() {
  }

  onEnter(event): void {
    event.stopImmediatePropagation();
    this.blur();
  }

  onFocus(): void {
    this.hasFocus = true;
  }

  focus(): void {
    this.hasFocus = true;
    this.input.nativeElement.focus();

  }

  blur(): void {
    this.hasFocus = false;
    this.input.nativeElement.blur();
  }

  onBlur(): void {
    this.hasFocus = false;

    this.lastBlurred = Date.now();
    this.state.title = this.input.nativeElement.innerText;
  }

  toggleFocusInput(): void {
    if (!this.hasFocus && Date.now() - this.lastBlurred > 300) {
      this.focus();

      // Move caret to end of text
      const range = document.createRange();
      range.selectNodeContents(this.input.nativeElement);
      range.collapse(false);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}
