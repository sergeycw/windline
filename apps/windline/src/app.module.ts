import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig, redisConfig } from '@windline/config';
import { Route } from '@windline/entities';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GpxModule } from './gpx/gpx.module';
import { RoutesModule } from './routes/routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
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
    GpxModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
