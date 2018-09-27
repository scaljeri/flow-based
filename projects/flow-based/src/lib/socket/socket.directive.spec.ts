import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SocketDirective } from './socket.directive';

describe('SocketComponent', () => {
  let component: SocketDirective;
  let fixture: ComponentFixture<SocketDirective>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SocketDirective ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SocketDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
