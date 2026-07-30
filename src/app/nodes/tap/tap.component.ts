import { ChangeDetectorRef, Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { NodeService, FbSocket } from '@scaljeri/flow-based';
import { TapWorker } from '../../workers/tap';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'fb-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss']
})
export class TapComponent implements OnInit, OnDestroy {
  public worker!: TapWorker;
  public sockets: FbSocket[] = [];
  private subscriptions: Subscription[] = [];

  @HostBinding('class.is-active') isActive = false;
  value: any;

  constructor(private cdr: ChangeDetectorRef,
              private service: NodeService) {
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
