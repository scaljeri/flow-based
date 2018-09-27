import { TestBed, inject } from '@angular/core/testing';

import { ComponentSelectionService } from './component-selection.service';

describe('ComponentSelectionService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ComponentSelectionService]
    });
  });

  it('should be created', inject([ComponentSelectionService], (service: ComponentSelectionService) => {
    expect(service).toBeTruthy();
  }));
});
