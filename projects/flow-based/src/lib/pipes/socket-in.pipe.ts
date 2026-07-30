import { Pipe, PipeTransform } from '@angular/core';
import { FbSocket } from '../flow-based';

@Pipe({
  name: 'socketIn',
  standalone: false,
})
export class SocketInPipe implements PipeTransform {

  // `FbNodeState.sockets` is optional, so accept nullish rather than forcing
  // every caller to assert in its template.
  transform(sockets: FbSocket[] | null | undefined): FbSocket[] {
    return (sockets ?? []).filter(socket => socket.type === 'in');
  }

}
