import { Injectable } from '@angular/core';
import { FbSocket, FbSocketType } from './flow-based';

@Injectable({
  providedIn: 'root'
})
export class FbSocketBuilderService {
  static SOCKET_IN = 'in' as FbSocketType;
  static SOCKET_OUT = 'out' as FbSocketType;

  constructor() { }

  static create(type: FbSocketType): FbSocket {
    return {
      type,
      id: Date.now()
    } as FbSocket;
  }
}
