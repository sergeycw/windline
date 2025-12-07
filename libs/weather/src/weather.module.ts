import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WEATHER_PROVIDER } from './weather-provider.interface';
import { OpenMeteoProvider } from './providers/openmeteo.provider';
import { WeatherProviderType } from './weather.config';

@Module({})
export class WeatherModule {
  static forRoot(): DynamicModule {
    return {
      module: WeatherModule,
      providers: [
        {
          provide: WEATHER_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<WeatherProviderType>('weather.provider', 'openmeteo');

            switch (provider) {
              case 'openmeteo':
                return new OpenMeteoProvider();
              case 'openweathermap':
                throw new Error('OpenWeatherMap provider not implemented yet');
              default:
                return new OpenMeteoProvider();
            }
          },
          inject: [ConfigService],
        },
      ],
      exports: [WEATHER_PROVIDER],
    };
  }
}
