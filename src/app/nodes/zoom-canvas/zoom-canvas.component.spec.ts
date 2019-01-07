import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoomCanvasComponent } from './zoom-canvas.component';

describe('ZoomCanvasComponent', () => {
  let component: ZoomCanvasComponent;
  let fixture: ComponentFixture<ZoomCanvasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ZoomCanvasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ZoomCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
