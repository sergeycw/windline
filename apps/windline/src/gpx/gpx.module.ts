import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GPX_PARSER } from '@windline/gpx';
import { TogeojsonParser } from '@windline/gpx';
import { Route } from '@windline/entities';
import { GpxService } from './gpx.service';
import { GpxController } from './gpx.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Route])],
  controllers: [GpxController],
  providers: [
    GpxService,
    {
      provide: GPX_PARSER,
      useClass: TogeojsonParser,
    },
  ],
  exports: [GpxService],
})
export class GpxModule {}
