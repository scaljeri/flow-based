import { Component, Inject, OnInit } from '@angular/core';
import { FbSocket } from '@scaljeri/flow-based';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DialogAction {
  action: 'delete' | 'edit' | 'create';
  socket?: FbSocket;
}
@Component({
  standalone: false,
  selector: 'fb-add-socket',
  templateUrl: './add-socket.component.html',
  styleUrls: ['./add-socket.component.scss']
})
export class AddSocketComponent implements OnInit {
  socketForm!: FormGroup;
  isNew = false;

  constructor(private fb: FormBuilder,
              public dialogRef: MatDialogRef<AddSocketComponent>,
              @Inject(MAT_DIALOG_DATA) public socket: Partial<FbSocket>) {
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
