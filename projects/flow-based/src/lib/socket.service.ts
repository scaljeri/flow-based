import { Injectable } from '@angular/core';
import { FbKeyValues, FbSocketDetails, FbSocketEvent } from './flow-based';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class SocketService {
  private socketClicked = new Subject<FbSocketEvent | null>();
  public socketClicked$ = this.socketClicked.asObservable();

  public sockets: FbKeyValues<FbSocketDetails> = {};
  private lastEvent: FbSocketEvent | null = null;

  constructor() {
  }

  onSocketClick(event: FbSocketEvent | null): void {
    this.lastEvent = event;
    this.socketClicked.next(event);
  }

  outsideClick(): void {
    if (this.lastEvent) {
      this.socketClicked.next(null);
    }

    this.lastEvent = null;
  }

  addSocket(id: number, sd: FbSocketDetails): void {
    this.sockets[id] = sd;
  }

  /*
   * addSocket() had no counterpart, so destroyed SocketComponents stayed in this
   * map forever, pointing at detached DOM. clearPosition() then walked all of
   * them — including the dead ones — on every single node move
   * (docs/AUDIT.md §3.3).
   */
  removeSocket(id: number): void {
    delete this.sockets[id];
  }

  // Undefined until the socket's component has registered itself in
  // ngAfterViewInit, which is a real window during initial render.
  getSocket(id: number): FbSocketDetails | undefined {
    return this.sockets[id];
  }

  /**
   * @deprecated No-op. Socket positions are computed from node geometry now
   * (FbGeometry), so there is no cached client rect to invalidate. This used to
   * walk every registered socket — including ones belonging to destroyed
   * components — on every single node move.
   */
  clearPosition(id?: number): void {
    // Intentionally empty.
  }

  reset(): void {
    this.sockets = {};
  }
}


