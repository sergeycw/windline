import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Telegraf } from 'telegraf';

interface UploadResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    distance: number;
    pointsCount: number;
    isNew: boolean;
  };
  error?: string;
}

@Injectable()
export class GpxUploadService {
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3000';
  }

  async uploadFromTelegram(
    bot: Telegraf<Context>,
    fileId: string,
    userId: number,
    fileName: string,
  ): Promise<UploadResult> {
    try {
      const fileLink = await bot.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);

      if (!response.ok) {
        return { success: false, error: 'Failed to download file from Telegram' };
      }

      const gpxContent = await response.text();

      const apiResponse = await fetch(`${this.apiUrl}/gpx/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpxContent, userId, fileName }),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        return { success: false, error: `API error: ${errorText}` };
      }

      const data = await apiResponse.json();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }
}
