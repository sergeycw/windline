import { Injectable } from '@nestjs/common';
import { Update, Ctx, Start, Help, On } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { GpxUploadService } from './gpx-upload.service';
import { WeatherApiService } from './weather-api.service';

@Update()
@Injectable()
export class BotUpdate {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly gpxUploadService: GpxUploadService,
    private readonly weatherApiService: WeatherApiService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('Welcome to Windline! Send me a GPX file to get weather forecast for your route.');
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply(
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
      await ctx.reply('Send me a GPX file to analyze weather for your route.');
    }
  }

  @On('document')
  async onDocument(@Ctx() ctx: Context) {
    const message = ctx.message;
    if (!message || !('document' in message)) return;

    const document = message.document;
    const fileName = document.file_name || 'route.gpx';

    if (!fileName.toLowerCase().endsWith('.gpx')) {
      await ctx.reply('Please send a GPX file (.gpx extension).');
      return;
    }

    await ctx.reply('Processing GPX file...');

    const userId = message.from?.id;
    if (!userId) {
      await ctx.reply('Error: Could not identify user.');
      return;
    }

    const result = await this.gpxUploadService.uploadFromTelegram(
      this.bot,
      document.file_id,
      userId,
      fileName,
    );

    if (!result.success) {
      await ctx.reply(`Error: ${result.error}`);
      return;
    }

    const route = result.data!;
    const distanceKm = (route.distance / 1000).toFixed(1);
    const status = route.isNew ? 'New route saved!' : 'Route already exists.';

    await ctx.reply(
      `${status}\n\n` +
      `📍 ${route.name}\n` +
      `📏 Distance: ${distanceKm} km\n` +
      `🔢 Points: ${route.pointsCount}`
    );

    await ctx.reply('Fetching weather forecast...');

    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + 7);

    const forecastResult = await this.weatherApiService.getForecast(
      route.id,
      forecastDate,
      8,
      10,
    );

    if (!forecastResult.success) {
      await ctx.reply(`⚠️ Could not fetch weather: ${forecastResult.error}`);
      return;
    }

    const forecastMessage = this.weatherApiService.formatForecast(forecastResult.data!);
    await ctx.reply(forecastMessage);
  }
}
