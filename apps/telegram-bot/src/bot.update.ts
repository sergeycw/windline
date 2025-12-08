import { Injectable, Logger } from '@nestjs/common';
import { Update, Ctx, Start, Help, On } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { GpxUploadService } from './gpx-upload.service';
import { WeatherApiService } from './weather-api.service';
import {
  addDays,
  DEFAULT_FORECAST_DAYS_AHEAD,
  DEFAULT_FORECAST_START_HOUR,
  DEFAULT_FORECAST_DURATION_HOURS,
} from '@windline/common';

@Update()
@Injectable()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly gpxUploadService: GpxUploadService,
    private readonly weatherApiService: WeatherApiService,
  ) {}

  private async safeReply(ctx: Context, text: string): Promise<void> {
    try {
      await ctx.reply(text);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async safeReplyWithPhoto(ctx: Context, source: Buffer, caption?: string): Promise<void> {
    try {
      await ctx.replyWithPhoto({ source }, caption ? { caption } : undefined);
    } catch (error) {
      this.logger.error(`Failed to send photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    await this.safeReply(ctx, 'Welcome to Windline! Send me a GPX file to get weather forecast for your route.');
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await this.safeReply(
      ctx,
      'Commands:\n' +
      '/start - Start the bot\n' +
      '/help - Show this help\n\n' +
      'Send me a GPX file to analyze weather for your route.'
    );
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const message = ctx.message;
    if (message && 'text' in message) {
      await this.safeReply(ctx, 'Send me a GPX file to analyze weather for your route.');
    }
  }

  @On('document')
  async onDocument(@Ctx() ctx: Context) {
    const message = ctx.message;
    if (!message || !('document' in message)) return;

    const document = message.document;
    const fileName = document.file_name || 'route.gpx';

    if (!fileName.toLowerCase().endsWith('.gpx')) {
      await this.safeReply(ctx, 'Please send a GPX file (.gpx extension).');
      return;
    }

    await this.safeReply(ctx, 'Processing GPX file...');

    const userId = message.from?.id;
    if (!userId) {
      await this.safeReply(ctx, 'Error: Could not identify user.');
      return;
    }

    const result = await this.gpxUploadService.uploadFromTelegram(
      this.bot,
      document.file_id,
      userId,
      fileName,
    );

    if (!result.success) {
      await this.safeReply(ctx, `Error: ${result.error}`);
      return;
    }

    const route = result.data!;
    const distanceKm = (route.distance / 1000).toFixed(1);
    const status = route.isNew ? 'New route saved!' : 'Route already exists.';

    await this.safeReply(
      ctx,
      `${status}\n\n` +
      `📍 ${route.name}\n` +
      `📏 Distance: ${distanceKm} km\n` +
      `🔢 Points: ${route.pointsCount}`
    );

    await this.safeReply(ctx, 'Fetching weather forecast...');

    const forecastDate = addDays(new Date(), DEFAULT_FORECAST_DAYS_AHEAD);

    const forecastResult = await this.weatherApiService.getForecastWithPolling(
      route.id,
      forecastDate,
      DEFAULT_FORECAST_START_HOUR,
      DEFAULT_FORECAST_DURATION_HOURS,
    );

    if (!forecastResult.success) {
      await this.safeReply(ctx, `⚠️ Could not fetch weather: ${forecastResult.error}`);
      return;
    }

    const forecast = forecastResult.data!;

    if (forecast.hasImage) {
      const imageResult = await this.weatherApiService.getForecastImage(forecast.requestId);

      if (imageResult.success && imageResult.buffer) {
        await this.safeReplyWithPhoto(ctx, imageResult.buffer);
        return;
      }
    }

    const forecastMessage = this.weatherApiService.formatForecast(forecast);
    await this.safeReply(ctx, forecastMessage);
  }
}
