import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class UploadGpxDto {
  @IsString()
  @IsNotEmpty()
  gpxContent: string;

  @IsNumber()
  @IsPositive()
  userId: number;

  @IsOptional()
  @IsString()
  fileName?: string;
}
