import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Host,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { XxlFlowUnitState } from '../../../../projects/flow-based/src/lib/flow-based';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements OnInit, OnDestroy, AfterViewInit {
  state: XxlFlowUnitState;
  worker: MergeStreamsWorker;
  isActive = false;
  values;
  value;
  streamValues = {};
  private subscriptions: Subscription[] = [];
  private clickSubscription: Subscription;

  @ViewChild('output', {read: ElementRef}) output: ElementRef;
  @ViewChildren('inputs', {read: ElementRef}) inputs: QueryList<ElementRef>;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              @Host() private service: NodeService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.worker = this.service.worker as MergeStreamsWorker;

    this.subscriptions.push(this.worker.getStream().subscribe(value => {
      this.value = value.toFixed(3);
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.worker.getValues().subscribe(values => {
      this.streamValues = values;

      if (this.isActive) {
        setTimeout(() => {
          this.cdr.detectChanges();
        });
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  ready(): void {
    // TODO
  }

  onMaxSize(isMaxSize: boolean): void {
    if (isMaxSize) {
      this.createConnections();
    }
  }

  onEdit(isEditing: boolean): void {
    if (!isEditing) {
      this.createConnections();
    }
  }

  createConnections(): void {
    this.service.removeConnections();

    setTimeout(() => {
      this.inputs.forEach((s, i) => {
        const socketId = s.nativeElement.dataset.socketId;
        const sd = this.service.getSocket(socketId);

        this.service.addConnection(sd.comp.element.nativeElement, this.inputs.toArray()[i].nativeElement);
        this.service.addConnection(this.inputs.toArray()[i].nativeElement, this.output.nativeElement);
      });

      const outSocket = this.state.sockets!.filter(s => s.type === 'out')[0];
      this.service.addConnection(this.output.nativeElement, this.service.getSocket(outSocket.id!).comp.element.nativeElement);

      // this.cdr.detectChanges();
    });
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onClose(): void {
    this.service.setMaxSize(false);
    this.service.unregister('blur');
    this.isActive = false;
  }

  ngAfterViewInit(): void {
    this.inputs.changes.subscribe(() => {
    });
  }

  get title(): string | null | undefined {
    return this.state.title;
  }
}
