import { Injectable } from '@angular/core';
import { FbKeyValues, SocketDetails, XxlSocketEvent } from './flow-based';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class SocketService {
  private socketClicked = new Subject<XxlSocketEvent | null>();
  public socketClicked$ = this.socketClicked.asObservable();

  public sockets: FbKeyValues<SocketDetails> = {};
  private lastEvent: XxlSocketEvent | null;

  constructor() {
  }

  onSocketClick(event: XxlSocketEvent | null): void {
    this.lastEvent = event;
    this.socketClicked.next(event);
  }

  outsideClick(): void {
    if (!!this.lastEvent) {
      this.socketClicked.next(null);
    }

    this.lastEvent = null;
  }

  addSocket(id: number, sd: SocketDetails): void {
    this.sockets[id] = sd;
  }

  getSocket(id: number): SocketDetails {
    return this.sockets[id];
  }

  clearPosition(id?: number): void {
    Object.keys(this.sockets).map(k => this.sockets[k])
      .filter((s: SocketDetails) => !id || s.parentId === id)
      .forEach(s => {
        s.comp.resetPosition();
      });
  }

  reset(): void {
    this.sockets = {};
  }
}


