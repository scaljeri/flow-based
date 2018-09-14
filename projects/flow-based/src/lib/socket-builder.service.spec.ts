import { TestBed, inject } from '@angular/core/testing';

import { SocketBuilderService } from './socket-builder.service';

describe('SocketBuilderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SocketBuilderService]
    });
  });

  it('should be created', inject([SocketBuilderService], (service: SocketBuilderService) => {
    expect(service).toBeTruthy();
  }));
});
