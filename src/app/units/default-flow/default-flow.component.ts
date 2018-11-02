import { Component, Host, HostBinding, Input, OnInit } from '@angular/core';
import { FbNode, XxlSocket } from 'projects/flow-based/src/lib/flow-based';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { MatDialog } from '@angular/material';
import { AddSocketComponent, DialogAction } from './add-socket/add-socket.component';
import { EditSocketComponent } from './edit-socket/edit-socket.component';

@Component({
  selector: 'fb-default-flow',
  templateUrl: './default-flow.component.html',
  styleUrls: ['./default-flow.component.scss']
})
export class DefaultFlowComponent implements FbNode, OnInit {
  @Input() title: string;
  private worker: any;

  @HostBinding('class.is-active') active = false;

  constructor(public dialog: MatDialog,
              @Host() private service: XxlFlowUnitService) {
  }

  ngOnInit() {
    this.worker = this.service.worker;
  }

  getSockets(): XxlSocket[] {
    return [];
  }

  setActive(isActive: boolean): void {
    this.active = isActive;
  }

  socketClicked(socket: XxlSocket): void {
    this.openDialog(socket);
  }

  onDelete(): void {
    this.service.deleteSelf();

  }

  onClose(): void {
    this.service.closeSelf();
  }

  openDialog(socket: Partial<XxlSocket>): void {
    const dialogRef = this.dialog.open(AddSocketComponent, {
      panelClass: 'add-socket-dialog',
      width: '400px',
      data: socket
    });

    this.service.requireBlur(() => dialogRef.close());

    dialogRef.afterClosed().subscribe((result: DialogAction) => {
      this.service.removeBlur();

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

    this.service.requireBlur(() => dialogRef.close());

    dialogRef.afterClosed().subscribe((updates: XxlSocket[]) => {
      this.service.removeBlur();

      if (updates) {
        sockets.filter(socket => {
          if (!updates.some(update => update.id === socket.id)) {
            this.service.socketRemoved(socket);
          }

          this.worker.state.sockets = [...updates, ...this.worker.getSockets().filter(item => item.type !== type)];
        });
      }
    });
  }

  // connected(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  // }
  //
  // getFormat(socket: XxlSocket): string {
  //   return '';
  // }
  //
  // disconnect(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  // }
}
