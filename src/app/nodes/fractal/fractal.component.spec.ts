import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FractalComponent } from './fractal.component';

describe('FractalComponent', () => {
  let component: FractalComponent;
  let fixture: ComponentFixture<FractalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FractalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FractalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
