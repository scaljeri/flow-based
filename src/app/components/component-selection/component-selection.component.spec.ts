import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentSelectionComponent } from './component-selection.component';

describe('ComponentSelectionComponent', () => {
  let component: ComponentSelectionComponent;
  let fixture: ComponentFixture<ComponentSelectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ComponentSelectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComponentSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
