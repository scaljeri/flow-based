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
import { XxlFlowUnitState, XxlSocket } from '../../../../projects/flow-based/src/lib/flow-based';
import { filter } from 'rxjs/operators';
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
  lastClicked;
  private subscriptions: Subscription[] = [];

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
      if (this.isActive) {
        if (Object.keys(this.streamValues).length === 0) {
          this.streamValues = values;
          this.setActive(true);
        }
      }

      this.streamValues = values;

      this.cdr.detectChanges();
    }));

    // Listen for maxSize events
    this.subscriptions.push(this.service.nodeMax$.subscribe(isMax => {
      this.isActive = isMax;

      if (!this.service.connections) {
        this.setActive(this.isActive);
      } else if (!isMax) {
        this.service.removeConnections();
        this.service.calibrate();
      }
    }));

    // Listen for click events
    this.subscriptions.push(this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) > 300;
        this.lastClicked = Date.now();
        this.service.setMaxSize(this.isActive);
      } else {
        this.service.removeConnections();
        this.service.setMaxSize(true);
      }

    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  ready(): void {
    // TODO
  }

  setActive(state: boolean): void {
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
    this.service.setMaxSize(false);
    this.isActive = false;
  }

  ngAfterViewInit(): void {
    this.inputs.changes.subscribe(() => {
    });
  }

  get title(): string | null | undefined {
    return this.worker ? this.worker.title : null;
  }
}
