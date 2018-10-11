import { Component, Host, HostBinding, Inject, Input, OnInit } from '@angular/core';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket } from 'projects/flow-based/src/lib/flow-based';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { MatDialog } from '@angular/material';
import { AddSocketComponent, DialogAction } from './add-socket/add-socket.component';

@Component({
  selector: 'fb-default-flow',
  templateUrl: './default-flow.component.html',
  styleUrls: ['./default-flow.component.scss']
})
export class DefaultFlowComponent implements XxlFlowUnit, OnInit {
  @Input() title: string;

  @HostBinding('class.is-active') active = false;

  constructor(public dialog: MatDialog,
              @Host() private service: XxlFlowUnitService) {
  }

  ngOnInit() {
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
        if (result.action === 'delete') {
          this.service.deleteSocket(result.socket);
        } else {
          this.service.addSocket(result.socket);
        }
      }
    });
  }
}
