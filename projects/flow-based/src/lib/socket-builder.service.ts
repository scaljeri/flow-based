import { Injectable } from '@angular/core';
import { XxlSocket, XxlSocketType } from 'flow-based';

@Injectable({
  providedIn: 'root'
})
export class XxlSocketBuilderService {
  static SOCKET_IN = 'in' as XxlSocketType;
  static SOCKET_OUT = 'out' as XxlSocketType;

  private static socketCount = 0;

  constructor() { }

  create(type: XxlSocketType): XxlSocket {
    return {
      type,
      id: '' + XxlSocketBuilderService.socketCount
    } as XxlSocket;
  }
}
