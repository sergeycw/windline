import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { telegramConfig } from '@windline/config';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotService } from './telegram-bot.service';
import { BotUpdate } from './bot.update';
import { GpxUploadService } from './gpx-upload.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [telegramConfig],
    }),
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('telegram.token') || '',
      }),
    }),
  ],
  controllers: [TelegramBotController],
  providers: [TelegramBotService, BotUpdate, GpxUploadService],
})
export class TelegramBotModule {}
