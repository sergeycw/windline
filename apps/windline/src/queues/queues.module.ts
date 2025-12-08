import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_WEATHER_FETCH, QUEUE_IMAGE_RENDER } from '@windline/queue-jobs';
import { WeatherFetchProcessor } from './weather-fetch.processor';
import { ImageRenderProcessor } from './image-render.processor';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: QUEUE_WEATHER_FETCH,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: QUEUE_IMAGE_RENDER,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
    ),
    forwardRef(() => WeatherModule),
  ],
  providers: [WeatherFetchProcessor, ImageRenderProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
