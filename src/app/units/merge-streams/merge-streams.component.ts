import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Host, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { XxlFlowUnitService } from '../../../../projects/flow-based/src/lib/services/flow-unit-service';
import { XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements OnInit, AfterViewInit {
  state: XxlFlowUnitState;
  worker: MergeStreamsWorker;
  isActive = false;
  values;
  value;
  streamValues;
  lastClicked;

  @ViewChild('output', {read: ElementRef}) output: ElementRef;
  @ViewChildren('inputs', {read: ElementRef}) inputs: QueryList<ElementRef>;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              @Host() private service: XxlFlowUnitService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.worker = this.service.worker as MergeStreamsWorker;
    this.worker.getStream().subscribe(value => {
      this.value = value.toFixed(3);
      this.cdr.detectChanges();
    });

    this.worker.getValues().subscribe(values => {
      this.streamValues = values;
      this.cdr.detectChanges();
    });

    this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) > 300;
        this.lastClicked = Date.now();
      } else {
        this.isActive = true;
      }

      this.service.setMaxState(this.isActive);

     // setTimeout(() => {
        this.setActive(this.isActive);
    //  });
    });
  }

  ready(): void {

  }

  setActive(state: boolean): void {
    this.isActive = state;

    if (state) {
      setTimeout(() => {
        this.inputs.forEach((s, i) => {
          const socketId = s.nativeElement.dataset.socketId;
          const sd = this.service.getSocket(socketId);

          this.service.addConnection(sd.comp.element.nativeElement, this.inputs.toArray()[i].nativeElement);
          this.service.addConnection(this.inputs.toArray()[i].nativeElement, this.output.nativeElement);
        });

        const outSocket = this.state.sockets!.filter(s => s.type === 'out')[0];
        this.service.addConnection(this.output.nativeElement, this.service.getSocket(outSocket.id!).comp.element.nativeElement);
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

  get title(): string | null | undefined {
    return this.worker ? this.worker.title : null;
  }

  ngAfterViewInit(): void {
    this.inputs.changes.subscribe(() => {
    });
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
