import { Injectable, Logger } from '@nestjs/common';
import { Update, Ctx, Start, Help, On, Action } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { GpxUploadService } from './gpx-upload.service';
import { WeatherApiService } from './weather-api.service';

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}
import {
  addDays,
  formatDateISO,
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

  private async safeReplyWithMarkup(
    ctx: Context,
    text: string,
    buttons: InlineKeyboardButton[][],
  ): Promise<void> {
    try {
      await ctx.reply(text, { reply_markup: { inline_keyboard: buttons } });
    } catch (error) {
      this.logger.error(`Failed to send message with markup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateDateButtons(routeId: string): InlineKeyboardButton[][] {
    const buttons: InlineKeyboardButton[][] = [];
    const today = new Date();

    let currentRow: InlineKeyboardButton[] = [];
    for (let i = 0; i < 16; i++) {
      const date = addDays(today, i);
      const dayName = date.toLocaleDateString('ru', { weekday: 'short' });
      const dayNum = date.getDate();

      currentRow.push({
        text: `${dayName} ${dayNum}`,
        callback_data: `date:${routeId}:${formatDateISO(date)}`,
      });

      if (date.getDay() === 0 || currentRow.length === 7) {
        buttons.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      buttons.push(currentRow);
    }
    return buttons;
  }

  private generateTimeButtons(routeId: string, date: string): InlineKeyboardButton[][] {
    const buttons: InlineKeyboardButton[][] = [];
    for (let row = 0; row < 4; row++) {
      const rowButtons: InlineKeyboardButton[] = [];
      for (let col = 0; col < 6; col++) {
        const hour = row * 6 + col;
        rowButtons.push({
          text: `${hour}:00`,
          callback_data: `time:${routeId}:${date}:${hour}`,
        });
      }
      buttons.push(rowButtons);
    }
    return buttons;
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

    const buttons = this.generateDateButtons(route.id);
    await this.safeReplyWithMarkup(ctx, 'Select forecast date:', buttons);
  }

  @Action(/^date:(.+):(.+)$/)
  async onDateSelect(@Ctx() ctx: Context) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const match = ctx.callbackQuery.data.match(/^date:(.+):(.+)$/);
    if (!match) return;

    const [, routeId, dateStr] = match;

    await ctx.answerCbQuery();

    const buttons = this.generateTimeButtons(routeId, dateStr);
    await this.safeReplyWithMarkup(ctx, 'Select start time:', buttons);
  }

  @Action(/^time:(.+):(.+):(\d+)$/)
  async onTimeSelect(@Ctx() ctx: Context) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const match = ctx.callbackQuery.data.match(/^time:(.+):(.+):(\d+)$/);
    if (!match) return;

    const [, routeId, dateStr, startHourStr] = match;
    const startHour = parseInt(startHourStr, 10);
    const date = new Date(dateStr);

    await ctx.answerCbQuery();
    await this.safeReply(ctx, 'Fetching weather forecast...');

    const forecastResult = await this.weatherApiService.getForecastWithPolling(
      routeId,
      date,
      startHour,
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
