import { Component, EventEmitter, HostBinding, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { XxlSocket, XxlSocketType } from 'flow-based';
import { XxlSocketBuilderService } from '../../socket-builder.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'xxl-add-socket',
  templateUrl: './add-socket.component.html',
  styleUrls: ['./add-socket.component.scss']
})
export class AddSocketComponent implements OnInit, OnChanges {
  @Output() cancel = new EventEmitter<void>();
  @Output() create = new EventEmitter<XxlSocket>();

  socket: XxlSocket;

  @Input() @HostBinding('class.active') type: XxlSocketType;

  @HostBinding('class.socket-in') get isSocketIn(): boolean {
    return this.type === XxlSocketBuilderService.SOCKET_IN;
  }

  @HostBinding('class.socket-out') get isSocketOut(): boolean {
    return this.type === XxlSocketBuilderService.SOCKET_OUT;
  }

  socketForm: FormGroup;

  constructor(private fb: FormBuilder,
              private socketBuilder: XxlSocketBuilderService) {
  }

  ngOnInit() {
    this.socketForm = this.fb.group({
        id: Date.now().toString(),
        name: ['', Validators.required],
        description: [''],
        color: []
      });
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes.type.currentValue) {
      this.socket = this.socketBuilder.create(changes.type.currentValue);
    }
  }

  onSubmit(): void {
    this.create.emit(this.socket);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
