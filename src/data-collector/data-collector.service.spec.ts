import { Test, TestingModule } from '@nestjs/testing';
import { DataCollectorService } from './data-collector.service';

describe('DataCollectorService', () => {
  let service: DataCollectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataCollectorService],
    }).compile();

    service = module.get<DataCollectorService>(DataCollectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
