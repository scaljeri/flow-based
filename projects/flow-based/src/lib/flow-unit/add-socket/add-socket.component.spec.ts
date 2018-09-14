import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSocketComponent } from './add-socket.component';

describe('AddSocketComponent', () => {
  let component: AddSocketComponent;
  let fixture: ComponentFixture<AddSocketComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddSocketComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSocketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
