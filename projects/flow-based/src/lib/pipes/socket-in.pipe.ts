import { Pipe, PipeTransform } from '@angular/core';
import { XxlSocketBuilderService } from '../socket-builder.service';
import { XxlSocket } from '../flow-based';

@Pipe({
  name: 'socketIn',
  standalone: false,
})
export class SocketInPipe implements PipeTransform {

  // `FbNodeState.sockets` is optional, so accept nullish rather than forcing
  // every caller to assert in its template.
  transform(sockets: XxlSocket[] | null | undefined): XxlSocket[] {
    return (sockets ?? []).filter(socket => socket.type === XxlSocketBuilderService.SOCKET_IN);
  }

}
