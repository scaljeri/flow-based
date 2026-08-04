import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { NodeService, FbNodeState } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import { MergeStreamsWorker } from '../../workers/merge-streams';

/**
 * Opened: a card per incoming value, wired to its socket and to the sum.
 *
 * This IS the open state now — the shell mounts it only while the node is open,
 * so the old isActive bookkeeping and the hidden .minified twin are gone. The
 * wires appear when the view mounts and go when it unmounts.
 */
@Component({
  standalone: false,
  selector: 'fb-merge-streams-normal',
  templateUrl: './merge-streams-normal.component.html',
  styleUrls: ['./merge-streams-normal.component.scss']
})
export class MergeStreamsNormalComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  state: FbNodeState = this.service.state;
  worker!: MergeStreamsWorker;
  value = '';
  streamValues: { [socketId: string]: number[] } = {};

  private subscriptions: Subscription[] = [];
  private redraw?: ReturnType<typeof setTimeout>;

  @ViewChild('output', { read: ElementRef }) output!: ElementRef;
  @ViewChildren('inputs', { read: ElementRef }) inputs!: QueryList<ElementRef>;

  ngOnInit(): void {
    this.worker = this.service.worker as MergeStreamsWorker;

    this.subscriptions.push(this.worker.getStream().subscribe(value => {
      this.value = value.toFixed(3);
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.worker.getValues().subscribe(values => {
      this.streamValues = values;

      setTimeout(() => {
        this.cdr.detectChanges();
      });
    }));
  }

  /**
   * A card per value, so the cards come and go as values arrive. The lines
   * point at ELEMENTS, so every one is stale the moment its card is replaced.
   */
  ngAfterViewInit(): void {
    this.createConnections();

    this.subscriptions.push(this.inputs.changes.subscribe(() => {
      this.createConnections();
    }));
  }

  ngOnDestroy(): void {
    clearTimeout(this.redraw);
    this.subscriptions.forEach(s => s.unsubscribe());
    this.service.removeConnections();
  }

  /**
   * Draw a line from each input socket to its card, and from each card to the
   * output.
   *
   * The clear happens INSIDE the timeout, and any pending one is cancelled
   * first: two calls in quick succession — a value arriving as the node opens —
   * used to clear once and add twice, drawing every line on top of itself.
   */
  createConnections(): void {
    clearTimeout(this.redraw);

    this.redraw = setTimeout(() => {
      this.service.removeConnections();

      this.inputs.forEach((s, i) => {
        // dataset values are strings; the socket registry is keyed by number.
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
    });
  }
}
