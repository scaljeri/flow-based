import { AfterViewInit, Component, ElementRef, HostBinding, Inject, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { XxlSocket, XxlSocketType } from '../../../../../projects/flow-based/src/lib/flow-based';
import { NodeService } from '../../../../../projects/flow-based/src/lib/node/node-service';

export interface EditSocket {
  sockets: XxlSocket[];
  service: NodeService;
  type: XxlSocketType;
}

@Component({
  selector: 'fb-edit-socket',
  templateUrl: './edit-socket.component.html',
  styleUrls: ['./edit-socket.component.scss']
})
export class EditSocketComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('delete', {read: ElementRef}) refs: QueryList<ElementRef>;
  private connections: { [key: number]: number } = {};

  @HostBinding('class.align-delete-right')
  get getAlignment(): boolean {
    return this.data.type === 'out';
  }

  constructor(private fb: FormBuilder,
              public dialogRef: MatDialogRef<EditSocketComponent>,
              @Inject(MAT_DIALOG_DATA) public data: EditSocket) {
  }

  ngAfterViewInit(): void {
    const socketType = this.data.type;

    this.refs.forEach((ref, i) => {
      const el = ref.nativeElement,
        id = `edit-${i}`;

      const socketEl = this.data.service.getSocket(el.dataset.socketId).comp.element.nativeElement;
      if (socketType === 'in') {
        this.connections[id] = this.data.service.addConnection(socketEl, el);
      } else {
        this.connections[id] = this.data.service.addConnection(el, socketEl);
      }
    });

    let count = 0;
    const intervalId = setInterval(() => {
      count++;
      this.data.service.refresh();

      if (count === 20) {
        clearInterval(intervalId);
      }
    }, 50);

    this.dialogRef.beforeClose().subscribe(() => this.closing());
  }

  ngOnDestroy(): void {
    this.data.service.removeConnections();
  }

  onDelete(socket: XxlSocket, index: number): void {
    this.data.sockets = this.data.sockets.filter(s => s.id !== socket.id);
    this.data.service.removeConnection(this.connections[`edit-${index}`]);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    this.dialogRef.close(this.data.sockets);
  }

  private closing(): void {
    this.data.service.removeConnections();
  }
}
