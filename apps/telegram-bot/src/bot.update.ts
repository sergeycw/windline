import { Update, Ctx, Start, Help, On, Hears } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Update()
export class BotUpdate {
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
      await ctx.reply(`Echo: ${message.text}`);
    }
  }

  @On('document')
  async onDocument(@Ctx() ctx: Context) {
    await ctx.reply('GPX file received! Processing will be implemented soon.');
  }
}
