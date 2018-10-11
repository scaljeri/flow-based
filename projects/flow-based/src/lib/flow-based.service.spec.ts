import { TestBed, inject } from '@angular/core/testing';
import { XxlFlowBasedService } from './flow-based.service';

describe('FlowBasedService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [XxlFlowBasedService]
    });
  });

  it('should be created', inject([XxlFlowBasedService], (service: XxlFlowBasedService) => {
    expect(service).toBeTruthy();
  }));
});
