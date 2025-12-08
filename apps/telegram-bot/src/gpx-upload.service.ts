import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Telegraf } from 'telegraf';
import { FETCH_TIMEOUT_MS } from '@windline/common';

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

interface ApiErrorResponse {
  message?: string;
  statusCode?: number;
}

@Injectable()
export class GpxUploadService {
  private readonly logger = new Logger(GpxUploadService.name);
  private readonly apiUrl: string;
  private readonly apiSecretKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.getOrThrow<string>('API_URL');
    this.apiSecretKey = this.configService.get<string>('API_SECRET_KEY');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiSecretKey) {
      headers['X-API-Key'] = this.apiSecretKey;
    }
    return headers;
  }

  async uploadFromTelegram(
    bot: Telegraf<Context>,
    fileId: string,
    userId: number,
    fileName: string,
  ): Promise<UploadResult> {
    try {
      const fileLink = await bot.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to download file from Telegram: ${response.status}`);
        return { success: false, error: 'Failed to download file from Telegram' };
      }

      const gpxContent = await response.text();

      const apiResponse = await fetch(`${this.apiUrl}/gpx/upload`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ gpxContent, userId, fileName }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!apiResponse.ok) {
        const errorData = await this.parseErrorResponse(apiResponse);
        this.logger.warn(`API error: ${apiResponse.status} - ${errorData}`);
        return { success: false, error: this.getUserFriendlyError(apiResponse.status, errorData) };
      }

      const data = await apiResponse.json();
      return { success: true, data };
    } catch (error) {
      this.logger.error('Upload failed', error instanceof Error ? error.stack : error);

      if (error instanceof Error && error.name === 'TimeoutError') {
        return { success: false, error: 'Request timed out. Please try again.' };
      }

      return { success: false, error: 'Something went wrong. Please try again later.' };
    }
  }

  private async parseErrorResponse(response: Response): Promise<string> {
    try {
      const data: ApiErrorResponse = await response.json();
      return data.message || 'Unknown error';
    } catch {
      return await response.text();
    }
  }

  private getUserFriendlyError(status: number, serverMessage: string): string {
    if (status === 400) {
      if (serverMessage.toLowerCase().includes('gpx')) {
        return 'Invalid GPX file format. Please check your file.';
      }
      return 'Invalid request. Please try again.';
    }
    if (status === 413) {
      return 'File is too large. Maximum size is 10MB.';
    }
    if (status >= 500) {
      return 'Server error. Please try again later.';
    }
    return 'Something went wrong. Please try again.';
  }
}
