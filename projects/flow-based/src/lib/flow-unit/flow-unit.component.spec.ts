import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FlowUnitComponent } from './flow-unit.component';

describe('FlowUnitComponent', () => {
  let component: FlowUnitComponent;
  let fixture: ComponentFixture<FlowUnitComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FlowUnitComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FlowUnitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
