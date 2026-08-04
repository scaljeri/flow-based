import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComponentSelectionService {
  private selection: Subject<string>;
  public selection$: Observable<string>;

  /** The palette asking to be dismissed; whoever opened it owns the overlay. */
  private closes = new Subject<void>();
  public close$: Observable<void> = this.closes.asObservable();

  constructor() {
    this.selection = new Subject();
    this.selection$ = this.selection.asObservable();
  }

  select(type: string): void {
    this.selection.next(type);
  }

  close(): void {
    this.closes.next();
  }
}

