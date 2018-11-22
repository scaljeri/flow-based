import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MergeStreamsComponent } from './merge-streams.component';

describe('MergeStreamsComponent', () => {
  let component: MergeStreamsComponent;
  let fixture: ComponentFixture<MergeStreamsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MergeStreamsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MergeStreamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
