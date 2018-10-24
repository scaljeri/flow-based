import { AfterViewInit, Component, ElementRef, Host, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { XxlFlowUnit, XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';

@Component({
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements XxlFlowUnit, OnInit, AfterViewInit {
  state: XxlFlowUnitState;
  worker: MergeStreamsWorker;
  isActive = false;

  @ViewChild('output', {read: ElementRef}) output: ElementRef;
  @ViewChildren('inputs', {read: ElementRef}) inputs: QueryList<ElementRef>;

  constructor(private fb: FormBuilder,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.worker = this.service.worker as MergeStreamsWorker;
  }

  ready(): void {

  }

  setActive(state: boolean): void {
    this.isActive = state;

    if (state) {
      setTimeout(() => {
        this.inputs.forEach((s, i) => {
          const socketId = s.nativeElement.dataset.socketId;
          const el = this.service.wrapper.sockets[socketId];

          this.service.addConnection(el.element, this.inputs.toArray()[i].nativeElement);
          this.service.addConnection(this.inputs.toArray()[i].nativeElement, this.output.nativeElement);
        });

        const outSocket = this.worker.getSockets().filter(s => s.type === 'out')[0];
        this.service.addConnection(this.output.nativeElement, this.service.wrapper.sockets[outSocket.id].element);
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

  connected(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

  getFormat(socket: XxlSocket): string {
    return '';
  }

  disconnect(localSocket: XxlSocket, removeSocket: XxlSocket): void {
  }

  getSockets(): XxlSocket[] {
    return [
      {
        type: 'in',
        format: 'number'
      },
      {
        type: 'in',
        format: 'number'
      },
      {
        type: 'out',
        format: 'number'
      }];
  }
}
