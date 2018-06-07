import { TestBed, inject } from '@angular/core/testing';

import { FlowBasedManagerService } from './flow-based-manager.service';

describe('FlowBasedService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FlowBasedManagerService]
    });
  });

  it('should be created', inject([FlowBasedManagerService], (service: FlowBasedManagerService) => {
    expect(service).toBeTruthy();
  }));
});
