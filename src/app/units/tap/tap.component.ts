import { ChangeDetectorRef, Component, Host, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { TapWorker } from '../../workers/tap';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss']
})
export class TapComponent implements OnInit, OnDestroy {
  private worker: TapWorker;
  private subscriptions: Subscription[] = [];
  public sockets: XxlSocket[] = [];
  public history;

  @HostBinding('class.is-active') isActive = false;
  value: any;
  values: any[];

  lastClicked: number;

  constructor(private cdr: ChangeDetectorRef,
              @Host() private service: NodeService) {
    this.sockets = this.getSockets();
  }

  private connectWithWorker(): void {
    if (this.worker.currentValue !== undefined) {
      this.value = this.worker.currentValue.toFixed(2);
    }

    this.subscriptions.push(this.worker.getStream().subscribe(log => {
      this.value = this.worker.currentValue;
      this.cdr.detectChanges();
    }));
  }

  ngOnInit(): void {
    this.worker = this.service.worker as TapWorker;
    this.connectWithWorker();

    this.subscriptions.push(this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) < 300 ? false : true;
        this.lastClicked = Date.now();
      } else {
        this.isActive = true;
      }

      this.service.calibrate();
    }));

    this.isActive = this.service.state.config.expanded;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
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

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.isActive = false;
  }
}
