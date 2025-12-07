import { IsString, IsNotEmpty } from 'class-validator';

export class ParseGpxDto {
  @IsString()
  @IsNotEmpty()
  gpxContent: string;
}
