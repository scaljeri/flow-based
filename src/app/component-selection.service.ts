import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComponentSelectionService {
  private selection: Subject<{ type: string, isFlow: boolean}>;
  public selection$: Observable<{ type: string, isFlow: boolean}>;

  constructor() {
    this.selection = new Subject();
    this.selection$ = this.selection.asObservable();
  }
  select(type: { type: string, isFlow: boolean}): void {
    this.selection.next(type);
  }
}

