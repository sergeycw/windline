import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_IMAGE_RENDER, type ImageRenderJobData } from '@windline/queue-jobs';
import { WeatherService } from '../weather/weather.service';

@Processor(QUEUE_IMAGE_RENDER)
export class ImageRenderProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageRenderProcessor.name);

  constructor(private readonly weatherService: WeatherService) {
    super();
  }

  async process(job: Job<ImageRenderJobData>): Promise<void> {
    const { requestId } = job.data;
    this.logger.log(`Processing image render for request ${requestId}`);

    try {
      await this.weatherService.executeImageRender(requestId);
      this.logger.log(`Image render completed for request ${requestId}`);
    } catch (error) {
      this.logger.error(`Image render failed for request ${requestId}`, error);
      throw error;
    }
  }
}
