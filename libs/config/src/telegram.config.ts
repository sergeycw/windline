import { registerAs } from '@nestjs/config';

export const telegramConfig = registerAs('telegram', () => ({
  token: process.env.TELEGRAM_BOT_TOKEN || '',
}));
