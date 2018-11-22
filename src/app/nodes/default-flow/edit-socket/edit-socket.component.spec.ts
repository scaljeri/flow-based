import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSocketComponent } from './edit-socket.component';

describe('EditSocketComponent', () => {
  let component: EditSocketComponent;
  let fixture: ComponentFixture<EditSocketComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditSocketComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditSocketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
