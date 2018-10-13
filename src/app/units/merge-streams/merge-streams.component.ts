import { AfterViewInit, Component, ElementRef, Host, OnInit, ViewChild } from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';

@Component({
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements OnInit, AfterViewInit {
  state: XxlFlowUnitState;
  worker: MergeStreamsWorker;
  isActive = false;

  @ViewChild('test') test: ElementRef;

  constructor(private fb: FormBuilder,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }
  ngOnInit() {
    this.worker = this.service.worker as MergeStreamsWorker;
  }

  ready(): void {

  }

  getSockets(): XxlSocket[] {
    return this.worker.getSockets();
  }


  setActive(state: boolean): void {
    this.isActive = state;

    if (state) {
      setTimeout(() => {
        const socket = this.worker.getSockets()[0];
        const el = this.service.wrapper.sockets[socket.id];
        this.service.addConnection(el.element, this.test.nativeElement);
      });
    } else {
      this.service.removeConnections();
    }
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.closeSelf();
  }

  get title(): string {
    return this.worker.title;
  }

  ngAfterViewInit(): void {
  }
}
