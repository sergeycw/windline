import { Module } from '@nestjs/common';
import { WeatherModule as WeatherLibModule } from '@windline/weather';
import { WeatherService } from './weather.service';

@Module({
  imports: [WeatherLibModule.forRoot()],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
