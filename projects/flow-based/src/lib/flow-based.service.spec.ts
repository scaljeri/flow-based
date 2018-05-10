import { TestBed, inject } from '@angular/core/testing';

import { FlowBasedService } from './flow-based.service';

describe('FlowBasedService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FlowBasedService]
    });
  });

  it('should be created', inject([FlowBasedService], (service: FlowBasedService) => {
    expect(service).toBeTruthy();
  }));
});
