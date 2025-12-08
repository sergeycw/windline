import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RateLimitService, REDIS_CLIENT } from './rate-limit.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    RateLimitService,
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
