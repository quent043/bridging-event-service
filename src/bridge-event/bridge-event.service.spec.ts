import { Test, TestingModule } from '@nestjs/testing';
import { BridgeEventListenerService } from './bridge-event-listener.service';

describe('BridgeEventService', () => {
  let service: BridgeEventListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BridgeEventListenerService],
    }).compile();

    service = module.get<BridgeEventListenerService>(BridgeEventListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
