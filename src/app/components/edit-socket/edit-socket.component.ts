import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { FB_SOCKET_COLORS, FbNodeState, SocketDetails, XxlSocket, XxlSocketType } from '../../../../projects/flow-based/src/lib/flow-based';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';

export interface EditSocket {
  sockets: XxlSocket[];
  service: NodeService;
  type: XxlSocketType;
}

@Component({
  selector: 'fb-edit-socket',
  templateUrl: './edit-socket.component.html',
  styleUrls: ['./edit-socket.component.scss']
})
export class EditSocketComponent implements OnInit, AfterViewInit, OnDestroy {
  sockets: XxlSocket[];
  state: FbNodeState;

  @ViewChildren('delete', {read: ElementRef}) refs: QueryList<ElementRef>;
  private connections: { [key: number]: number } = {};
  public socketDetails: SocketDetails[];

  constructor(private element: ElementRef,
              private fb: FormBuilder,
              private service: NodeService,
              @Inject(FB_SOCKET_COLORS) private socketColors: Record<string, string>) {
  }

  ngOnInit(): void {
    this.state = this.service.state;
    this.socketDetails = this.service.getSockets();
    this.sockets = this.socketDetails.reduce((output: XxlSocket[], sd: SocketDetails) => {
      output.push(sd.state);

      return output;
    }, []);
  }

  ngAfterViewInit(): void {
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

  getSocketColor(socket: XxlSocket): string {
    return socket.color || this.socketColors[socket.format!] || '#ffffff';
  }

  setSocketColor(color, socket: XxlSocket): void {
    socket.color = color;
  }

  ngOnDestroy(): void {
    this.service.removeConnections();
  }

  onDelete(socket: XxlSocket, index: number): void {
    // this.data.sockets = this.data.sockets.filter(s => s.id !== socket.id);
    // this.data.service.removeConnection(this.connections[`edit-${index}`]);
  }

  onCancel(): void {
    // this.dialogRef.close();
  }

  onApply(): void {
    // this.dialogRef.close(this.data.sockets);
  }

  private closing(): void {
    // this.data.service.removeConnections();
  }
}
