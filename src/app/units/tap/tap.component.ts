import { ChangeDetectorRef, Component, Host, OnDestroy, OnInit } from '@angular/core';
import { FbNode, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { Subscription } from 'rxjs';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { TapWorker } from '../../workers/tap';

@Component({
  selector: 'fb-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss']
})
export class TapComponent implements FbNode, OnInit, OnDestroy {
  private worker: TapWorker;
  public sockets: XxlSocket[] = [];
  public history;

  isActive = false;
  subscription: Subscription;
  value: any;
  values: any[];


  constructor( private cdr: ChangeDetectorRef,
               @Host() private service: XxlFlowUnitService) {
    this.sockets = this.getSockets();
  }

  ngOnInit(): void {
    this.worker = this.service.worker as TapWorker;
    if (this.worker.currentValue !== undefined) {
      this.value = this.worker.currentValue.toFixed(2);
    }

    this.subscription = this.worker.getStream().subscribe(log => {
      this.value = this.worker.currentValue;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  getSockets(): XxlSocket[] {
    return [
      {
        type: 'in',
      },
      {
        type: 'out'
      }];
  }

  connected(localSocket: XxlSocket, remoteSocket: XxlSocket, sockets: XxlSocket[]): void {
    if (remoteSocket.format && remoteSocket.format !== localSocket.format) {
      sockets.forEach(s => s.format = remoteSocket.format);
      this.service.rebuild();
    }
  }

  reset(sockets: XxlSocket[]): void {
    sockets.forEach(s => delete s.format);
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.closeSelf();
  }
}
