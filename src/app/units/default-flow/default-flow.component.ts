import { Component, Host, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { XxlSocket } from 'projects/flow-based/src/lib/flow-based';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { MatDialog } from '@angular/material';
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
          this.onClose();

          return false; // unregister
        }, 'blur');
      }
    });
  }

  ngOnDestroy(): void {
    this.clickSubscription.unsubscribe();
  }

  getSockets(): XxlSocket[] {
    return [];
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.setMaxSize(false);
    this.isActive = false;
  }

  openDialog(socket: Partial<XxlSocket>): void {
    const dialogRef = this.dialog.open(AddSocketComponent, {
      panelClass: 'add-socket-dialog',
      width: '400px',
      data: socket
    });

    dialogRef.afterClosed().subscribe((result: DialogAction) => {
      if (result) {
        this.service.addSocket(result.socket!);
      }
    });
  }

  editDialog(type: 'in' | 'out'): void {
    const sockets = this.worker.getSockets().filter(socket => socket.type === type);

    const dialogRef = this.dialog.open(EditSocketComponent, {
      width: '400px',
      data: {
        sockets: sockets,
        service: this.service
      }
    });

    dialogRef.afterClosed().subscribe((updates: XxlSocket[]) => {
      if (updates) {
        sockets.filter(socket => {
          if (!updates.some(update => update.id === socket.id)) {
            this.service.socketRemoved(socket);
          }
        });
      }
    });
  }
}
