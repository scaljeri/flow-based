import { Component, Host, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { XxlSocket } from 'projects/flow-based/src/lib/flow-based';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { AddSocketComponent, DialogAction } from './add-socket/add-socket.component';
import { EditSocketComponent } from './edit-socket/edit-socket.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-default-flow',
  templateUrl: './default-flow.component.html',
  styleUrls: ['./default-flow.component.scss']
})
export class DefaultFlowComponent implements OnInit, OnDestroy {
  @Input() title: string;
  private worker: any;
  private clickSubscription: Subscription;
  private dialogRef: MatDialogRef<any> | null;

  @HostBinding('class.is-active') isActive = false;

  constructor(public dialog: MatDialog,
              @Host() private service: NodeService) {
  }

  ngOnInit() {
    this.worker = this.service.worker;

    this.service.closeOnDoubleClick(() => this.onClose());

    this.clickSubscription = this.service.nodeClicked$.subscribe(() => {
      if (!this.isActive) {
        this.isActive = true;
        this.service.setMaxSize(true);

        this.service.register(() => {
          if (this.dialogRef) {
            this.dialogRef.close();
            this.dialogRef = null;
            return true;
          }

          this.onClose();

          return false; // unregister
        }, 'blur');
      }
    });
  }

  ngOnDestroy(): void {
    this.clickSubscription.unsubscribe();
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.setMaxSize(false);
    this.isActive = false;
  }

  openDialog(socket: Partial<XxlSocket>): void {
    this.dialogRef = this.dialog.open(AddSocketComponent, {
      panelClass: 'add-socket-dialog',
      width: '400px',
      data: socket
    });

    this.dialogRef.afterClosed().subscribe((result: DialogAction) => {
      if (result) {
        this.service.addSocket(result.socket!);
      }
      this.dialogRef = null;
    });
  }

  editDialog(type: 'in' | 'out'): void {
    this.dialogRef = this.dialog.open(EditSocketComponent, {
      width: '400px',
      data: {
        sockets: (this.service.state.sockets || []).filter(socket => socket.type === type) || [],
        service: this.service,
        type
      }
    });

    this.dialogRef.afterClosed().subscribe((updates: XxlSocket[] = []) => {
      (this.service.state.sockets || []).filter(socket => {
        if (socket.type === type && !updates.some(update => update.id === socket.id)) {
          debugger;
          this.service.socketRemoved(socket);
        }
      });

      this.dialogRef = null;
    });
  }
}
