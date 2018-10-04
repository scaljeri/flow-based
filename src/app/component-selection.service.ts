import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComponentSelectionService {
  private selection: Subject<string>;
  public selection$: Observable<string>;

  constructor() {
    this.selection = new Subject();
    this.selection$ = this.selection.asObservable();
  }

  select(type: string): void {
    this.selection.next(type);
  }
}

