import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const REDIS_CLIENT = 'REDIS_CLIENT';
const DEFAULT_LIMIT = 10;
const TTL_SECONDS = 86400;

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly limit: number;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.limit = this.configService.get<number>('RATE_LIMIT_UPLOADS_PER_DAY', DEFAULT_LIMIT);
  }

  async checkAndIncrement(userId: number): Promise<RateLimitResult> {
    const key = this.getKey(userId);

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, TTL_SECONDS);
    }

    const allowed = current <= this.limit;
    const remaining = Math.max(0, this.limit - current);

    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for user ${userId}: ${current}/${this.limit}`);
    }

    return {
      allowed,
      current,
      limit: this.limit,
      remaining,
    };
  }

  private getKey(userId: number): string {
    const today = new Date().toISOString().split('T')[0];
    return `rate_limit:gpx:${userId}:${today}`;
  }
}

export { REDIS_CLIENT };
