import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MergeStreamsWorker } from '../../workers/merge-streams';
import { FormBuilder } from '@angular/forms';
import { NodeService, FbNodeState } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'fb-merge-streams',
  templateUrl: './merge-streams.component.html',
  styleUrls: ['./merge-streams.component.scss']
})
export class MergeStreamsComponent implements OnInit, OnDestroy, AfterViewInit {
  state: FbNodeState;
  worker!: MergeStreamsWorker;
  isActive = false;
  value = '';
  streamValues: { [socketId: string]: number[] } = {};
  private subscriptions: Subscription[] = [];

  @ViewChild('output', {read: ElementRef}) output!: ElementRef;
  @ViewChildren('inputs', {read: ElementRef}) inputs!: QueryList<ElementRef>;

  constructor(private fb: FormBuilder,
              private cdr: ChangeDetectorRef,
              private service: NodeService) {
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

  createConnections(): void {
    this.service.removeConnections();

    setTimeout(() => {
      this.inputs.forEach((s, i) => {
        // `dataset.socketId` is a string; the socket registry is keyed by id, so
        // convert rather than relying on JS object keys coercing.
        const socketId = Number(s.nativeElement.dataset.socketId);
        const sd = this.service.getSocket(socketId);

        // A socket the shell has not drawn yet has nothing to wire to.
        if (!sd) {
          return;
        }

        this.service.addConnection(sd.element, this.inputs.toArray()[i].nativeElement);
        this.service.addConnection(this.inputs.toArray()[i].nativeElement, this.output.nativeElement);
      });

      const outSocket = this.state.sockets!.filter(s => s.type === 'out')[0];
      const outDetails = outSocket ? this.service.getSocket(outSocket.id!) : undefined;

      if (outDetails) {
        this.service.addConnection(this.output.nativeElement, outDetails.element);
      }

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

  get title(): string {
    return this.state.title ?? '';
  }
}
