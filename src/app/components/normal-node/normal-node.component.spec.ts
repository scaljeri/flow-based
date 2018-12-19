import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NormalNodeComponent } from './normal-node.component';

describe('NormalNodeComponent', () => {
  let component: NormalNodeComponent;
  let fixture: ComponentFixture<NormalNodeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NormalNodeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NormalNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
