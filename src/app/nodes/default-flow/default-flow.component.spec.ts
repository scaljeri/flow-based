import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultFlowComponent } from './default-flow.component';

describe('DefaultFlowComponent', () => {
  let component: DefaultFlowComponent;
  let fixture: ComponentFixture<DefaultFlowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DefaultFlowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DefaultFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
