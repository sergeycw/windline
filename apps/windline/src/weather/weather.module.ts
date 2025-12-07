import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WeatherModule as WeatherLibModule } from '@windline/weather';
import { MapRendererModule } from '@windline/map-renderer';
import { QUEUE_WEATHER_FETCH } from '@windline/queue-jobs';
import { Route, ForecastRequest } from '@windline/entities';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [
    WeatherLibModule.forRoot(),
    MapRendererModule.register(),
    TypeOrmModule.forFeature([Route, ForecastRequest]),
    BullModule.registerQueue({ name: QUEUE_WEATHER_FETCH }),
    forwardRef(() => QueuesModule),
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
