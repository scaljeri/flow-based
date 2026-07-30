import { AfterViewInit, Component, ElementRef, Inject, Input, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FB_SOCKET_COLORS, FbNodeState, NodeService, FbSocketDetails, FbSocket } from '@scaljeri/flow-based';

@Component({
  standalone: false,
  selector: 'fb-edit-node',
  templateUrl: './edit-node.component.html',
  styleUrls: ['./edit-node.component.scss']
})
export class EditNodeComponent implements OnInit, AfterViewInit, OnDestroy {
  sockets: FbSocket[] = [];
  state!: FbNodeState;

  @Input() deleteSocket = true;

  @ViewChildren('action', {read: ElementRef}) refs!: QueryList<ElementRef>;
  private connections: { [key: number]: number } = {};
  public socketDetails: FbSocketDetails[] = [];

  constructor(private element: ElementRef,
              private fb: FormBuilder,
              private service: NodeService,
              @Inject(FB_SOCKET_COLORS) private socketColors: Record<string, string>) {
  }

  ngOnInit(): void {
    this.state = this.service.state;
    this.socketDetails = this.service.getSockets();
    this.sockets = this.socketDetails.reduce((output: FbSocket[], sd: FbSocketDetails) => {
      output.push(sd.state);

      return output;
    }, []);
  }

  ngAfterViewInit(): void {
    this.service.removeConnections();
    console.log('delete is ' + this.deleteSocket);

    setTimeout(() => {
      this.refs.forEach((ref, i) => {
        const el = ref.nativeElement;
        const id = parseInt(el.dataset.socketId, 10); // `edit-${i}`;

        const socketDetails = this.socketDetails.find(sd => sd.state.id === id)!;

        if (socketDetails.state.type === 'in') {
          this.connections[id] = this.service.addConnection(socketDetails.element, el);
        } else {
           this.connections[id] = this.service.addConnection(el, socketDetails.element);
        }
      });
    });
  }

  getSocketColor(socket: FbSocket): string {
    return socket.color || this.socketColors[socket.format!] || '#ffffff';
  }

  setSocketColor(color: string, socket: FbSocket): void {
    socket.color = color;
  }

  ngOnDestroy(): void {
    this.service.removeConnections();
  }

  onDelete(socket: FbSocket, index: number): void {
    // this.data.sockets = this.data.sockets.filter(s => s.id !== socket.id);
    // this.data.service.removeConnection(this.connections[`edit-${index}`]);
  }

  onCancel(): void {
    // this.dialogRef.close();
  }

  onApply(): void {
    // this.dialogRef.close(this.data.sockets);
  }

  hasSockets(): boolean {
    return !!this.sockets.length;
  }

  private closing(): void {
    // this.data.service.removeConnections();
  }
}
