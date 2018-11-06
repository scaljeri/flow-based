import { ChangeDetectorRef, Component, Host, HostBinding, OnInit } from '@angular/core';
import { XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { TapWorker } from '../../workers/tap';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'fb-tap',
  templateUrl: './tap.component.html',
  styleUrls: ['./tap.component.scss']
})
export class TapComponent implements OnInit {
  private worker: TapWorker;
  public sockets: XxlSocket[] = [];
  public history;

  @HostBinding('class.is-active') isActive = false;
  value: any;
  values: any[];

  lastClicked: number;

  constructor(private cdr: ChangeDetectorRef,
              @Host() private service: XxlFlowUnitService) {
    this.sockets = this.getSockets();
  }

  private connectWithWorker(): void {
    if (this.worker.currentValue !== undefined) {
      this.value = this.worker.currentValue.toFixed(2);
    }

    this.worker.getStream().subscribe(log => {
      this.value = this.worker.currentValue;
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.worker = this.service.worker as TapWorker;
    this.connectWithWorker();

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
