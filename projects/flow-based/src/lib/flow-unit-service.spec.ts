import { TestBed, inject } from '@angular/core/testing';

import { FlowUnitServiceService } from './flow-unit-service';

describe('XxlFlowUnitServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FlowUnitServiceService]
    });
  });

  it('should be created', inject([FlowUnitServiceService], (service: FlowUnitServiceService) => {
    expect(service).toBeTruthy();
  }));
});
