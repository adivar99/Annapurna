import { TestBed } from '@angular/core/testing';

import { GordonAgentService } from './gordon-agent.service';

describe('GordonAgentService', () => {
  let service: GordonAgentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GordonAgentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
