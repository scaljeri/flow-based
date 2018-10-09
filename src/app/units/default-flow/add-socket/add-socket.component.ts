import { Component, Inject, OnInit } from '@angular/core';
import { XxlSocket } from 'projects/flow-based/src/lib/flow-based';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

export interface DialogAction {
  action: 'delete' | 'edit' | 'create';
  socket?: XxlSocket;
}
@Component({
  selector: 'fb-add-socket',
  templateUrl: './add-socket.component.html',
  styleUrls: ['./add-socket.component.scss']
})
export class AddSocketComponent implements OnInit {
  socketForm: FormGroup;
  isNew: boolean;

  constructor(private fb: FormBuilder,
              public dialogRef: MatDialogRef<AddSocketComponent>,
              @Inject(MAT_DIALOG_DATA) public socket: Partial<XxlSocket>) {
  }

  ngOnInit() {
    this.isNew = !this.socket.id;

    this.socketForm = this.fb.group({
        type: this.socket.type,
        name: [this.socket.name, Validators.required],
        description: [this.socket.description],
        color: []
      });
  }


  onSubmit(): void {
    if (this.socketForm.valid) {
      this.dialogRef.close({
        action: this.isNew ? 'create' : 'edit',
        socket: this.socketForm.value
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    this.dialogRef.close({action: 'delete'});
  }
}
