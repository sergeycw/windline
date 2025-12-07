import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherModule as WeatherLibModule } from '@windline/weather';
import { Route, ForecastRequest } from '@windline/entities';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

@Module({
  imports: [
    WeatherLibModule.forRoot(),
    TypeOrmModule.forFeature([Route, ForecastRequest]),
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
