import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { telegramConfig, validateTelegram } from '@windline/config';
import { BotUpdate } from './bot.update';
import { GpxUploadService } from './gpx-upload.service';

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
      }),
    }),
  ],
  providers: [BotUpdate, GpxUploadService],
})
export class TelegramBotModule {}
