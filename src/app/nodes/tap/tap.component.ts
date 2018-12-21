import { ChangeDetectorRef, Component, Host, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { TapWorker } from '../../workers/tap';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss']
})
export class TapComponent implements OnInit, OnDestroy {
  public worker: TapWorker;
  public sockets: XxlSocket[] = [];
  public history;
  private subscriptions: Subscription[] = [];

  @HostBinding('class.is-active') isActive = false;
  value: any;
  values: any[];

  constructor(private cdr: ChangeDetectorRef,
              @Host() private service: NodeService) {
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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
