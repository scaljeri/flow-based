import { Pipe, PipeTransform } from '@angular/core';
import { XxlSocketBuilderService } from '../socket-builder.service';
import { XxlSocket } from 'flow-based';

@Pipe({
  name: 'socketOut'
})
export class SocketOutPipe implements PipeTransform {
  transform(sockets: XxlSocket[]): XxlSocket[] {
    return sockets.filter(socket => socket.type === XxlSocketBuilderService.SOCKET_OUT);
  }
}
