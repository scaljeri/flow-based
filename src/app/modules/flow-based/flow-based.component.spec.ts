import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowBasedComponent } from './flow-based.component';

describe('FlowBasedComponent', () => {
  let component: FlowBasedComponent;
  let fixture: ComponentFixture<FlowBasedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FlowBasedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowBasedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
