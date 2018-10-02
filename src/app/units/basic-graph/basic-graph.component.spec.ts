import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicGraphComponent } from './basic-graph.component';

describe('BasicGraphComponent', () => {
  let component: BasicGraphComponent;
  let fixture: ComponentFixture<BasicGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BasicGraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BasicGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
