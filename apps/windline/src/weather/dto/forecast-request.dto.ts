import { IsString, IsNotEmpty, IsNumber, IsPositive, Min, Max, IsDateString } from 'class-validator';

export class ForecastRequestDto {
  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsNumber()
  @IsPositive()
  @Max(24)
  durationHours: number;
}
