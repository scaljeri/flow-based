import { ChangeDetectorRef, Component, Host, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FbNode, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { Subscription } from 'rxjs';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { TapWorker } from '../../workers/tap';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'fb-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss']
})
export class TapComponent implements OnInit, OnDestroy {
  private worker: TapWorker;
  public sockets: XxlSocket[] = [];
  public history;

  @HostBinding('class.is-active') isActive = false;
  subscription: Subscription;
  activeSubscription: Subscription;
  value: any;
  values: any[];

  lastClicked: number;

  constructor(private cdr: ChangeDetectorRef,
              @Host() private service: XxlFlowUnitService) {
    this.sockets = this.getSockets();
  }

  private connectiWithWorker(): void {
    if (this.worker.currentValue !== undefined) {
      this.value = this.worker.currentValue.toFixed(2);
    }

    this.subscription = this.worker.getStream().subscribe(log => {
      this.value = this.worker.currentValue;
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.worker = this.service.worker as TapWorker;
    this.connectiWithWorker();

    this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) < 300 ? false : true;
        this.lastClicked = Date.now();
      } else {
        this.isActive = true;
      }
    });

    this.isActive = this.service.state.config.expanded;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    // this.activeSubscription.unsubscribe();
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
    this.isActive = false;
  }
}
