import { TestBed, inject } from '@angular/core/testing';

import { FlowUnitService } from './flow-unit-service';

describe('FlowUnitServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FlowUnitService]
    });
  });

  it('should be created', inject([FlowUnitService], (service: FlowUnitService) => {
    expect(service).toBeTruthy();
  }));
});
