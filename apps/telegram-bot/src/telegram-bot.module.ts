import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { telegramConfig, validateTelegram } from '@windline/config';
import { BotUpdate } from './bot.update';
import { GpxUploadService } from './gpx-upload.service';
import { WeatherApiService } from './weather-api.service';

const logger = new Logger('TelegramBot');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [telegramConfig],
      validate: validateTelegram,
    }),
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('telegram.token')!,
        middlewares: [
          async (ctx, next) => {
            try {
              await next();
            } catch (error) {
              logger.error(
                `Bot error for ${ctx.updateType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error.stack : undefined,
              );
            }
          },
        ],
      }),
    }),
  ],
  providers: [BotUpdate, GpxUploadService, WeatherApiService],
})
export class TelegramBotModule {}
