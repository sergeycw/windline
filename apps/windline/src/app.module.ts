import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { databaseConfig, redisConfig, validate, weatherConfig, mapRendererConfig } from '@windline/config';
import { Route } from '@windline/entities';
import { AppController } from './app.controller';
import { GpxModule } from './gpx/gpx.module';
import { RoutesModule } from './routes/routes.module';
import { WeatherModule } from './weather/weather.module';
import { QueuesModule } from './queues/queues.module';
import { RateLimitModule } from './rate-limit';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, weatherConfig, mapRendererConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [Route],
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
    }),
    RateLimitModule,
    GpxModule,
    RoutesModule,
    WeatherModule,
    QueuesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
