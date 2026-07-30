import { Pipe, PipeTransform } from '@angular/core';
import { FbSocketBuilderService } from '../socket-builder.service';
import { FbSocket } from '../flow-based';

@Pipe({
  name: 'socketOut',
  standalone: false,
})
export class SocketOutPipe implements PipeTransform {
  // `FbNodeState.sockets` is optional, so accept nullish rather than forcing
  // every caller to assert in its template.
  transform(sockets: FbSocket[] | null | undefined): FbSocket[] {
    return (sockets ?? []).filter(socket => socket.type === FbSocketBuilderService.SOCKET_OUT);
  }
}
