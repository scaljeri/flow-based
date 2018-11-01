import { Pipe, PipeTransform } from '@angular/core';
import { XxlSocketBuilderService } from '../socket-builder.service';
import { XxlSocket } from '../flow-based';

@Pipe({
  name: 'socketIn'
})
export class SocketInPipe implements PipeTransform {

  transform(sockets: XxlSocket[]): XxlSocket[] {
    const result = sockets.filter(socket => socket.type === XxlSocketBuilderService.SOCKET_IN);

    return result;
  }

}
