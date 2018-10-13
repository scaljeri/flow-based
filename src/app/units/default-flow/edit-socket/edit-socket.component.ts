import { AfterViewInit, Component, ElementRef, Host, HostBinding, Inject, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { XxlConnection, XxlSocket } from 'flow-based';
import { UnitWrapper } from '../../../../../projects/flow-based/src/lib/utils/unit-wrapper';
import { XxlFlowBasedService } from '../../../../../projects/flow-based/src/lib/flow-based.service';
import { DialogAction } from '../add-socket/add-socket.component';
import { XxlFlowUnitService } from '../../../../../projects/flow-based/src/lib/services/flow-unit-service';

export interface EditSocket {
  wrapper: UnitWrapper;
  service: XxlFlowUnitService;
  sockets: XxlSocket[];
}

@Component({
  selector: 'fb-edit-socket',
  templateUrl: './edit-socket.component.html',
  styleUrls: ['./edit-socket.component.scss']
})
export class EditSocketComponent implements OnInit, AfterViewInit {
  @ViewChildren('delete', {read: ElementRef}) refs: QueryList<ElementRef>;
  public sockets: XxlSocket[];
  private connections: { [key: string]: string } = {};

  @HostBinding('class.align-delete-right')
  get getAlignment(): boolean {
    return this.sockets[0].type === 'out';
  }

  constructor(private fb: FormBuilder,
              public dialogRef: MatDialogRef<EditSocketComponent>,
              @Inject(MAT_DIALOG_DATA) private data: EditSocket) {
  }

  ngOnInit() {
    this.sockets = this.data.sockets;
  }

  ngAfterViewInit(): void {
    const socketType = this.sockets[0].type;

    setTimeout(() => {
      this.refs.forEach((ref, i) => {
        const el = ref.nativeElement,
          id = `edit-${i}`;

        if (socketType === 'in') {
          this.connections[id] = this.data.service.addConnection(this.data.wrapper.sockets[el.dataset.socketId].element, el);
        } else {
          this.connections[id] = this.data.service.addConnection(el, this.data.wrapper.sockets[el.dataset.socketId].element);
        }
      });

      let count = 0;
      const intervalId = setInterval(() => {
        count++;
        this.data.wrapper.update();
        this.data.service.updateConnections();

        if (count === 20) {
          clearInterval(intervalId);
        }
      }, 50);
    });

    this.dialogRef.beforeClose().subscribe(() => this.closing());
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
