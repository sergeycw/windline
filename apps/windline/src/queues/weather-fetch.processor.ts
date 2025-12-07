import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_WEATHER_FETCH, QUEUE_IMAGE_RENDER, type WeatherFetchJobData } from '@windline/queue-jobs';
import { WeatherService } from '../weather/weather.service';

@Processor(QUEUE_WEATHER_FETCH)
export class WeatherFetchProcessor extends WorkerHost {
  private readonly logger = new Logger(WeatherFetchProcessor.name);

  constructor(
    private readonly weatherService: WeatherService,
    @InjectQueue(QUEUE_IMAGE_RENDER)
    private readonly imageRenderQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<WeatherFetchJobData>): Promise<void> {
    const { requestId } = job.data;
    this.logger.log(`Processing weather fetch for request ${requestId}`);

    try {
      await this.weatherService.executeWeatherFetch(requestId);

      await this.imageRenderQueue.add('render', { requestId }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
      });

      this.logger.log(`Weather fetch completed for request ${requestId}, image render queued`);
    } catch (error) {
      this.logger.error(`Weather fetch failed for request ${requestId}`, error);
      throw error;
    }
  }
}
