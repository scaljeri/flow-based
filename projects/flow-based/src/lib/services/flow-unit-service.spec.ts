import { TestBed, inject } from '@angular/core/testing';
import { XxlFlowUnitService } from './flow-unit-service';

describe('FlowUnitServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [XxlFlowUnitService]
    });
  });

  it('should be created', inject([XxlFlowUnitService], (service: XxlFlowUnitService) => {
    expect(service).toBeTruthy();
  }));
});
