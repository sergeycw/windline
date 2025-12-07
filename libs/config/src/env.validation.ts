import { plainToInstance, Type } from 'class-transformer';
import { IsString, IsNumber, IsNotEmpty, IsOptional, validateSync, Min, Max } from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  DATABASE_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  DATABASE_PORT?: number;

  @IsOptional()
  @IsString()
  DATABASE_USER?: string;

  @IsOptional()
  @IsString()
  DATABASE_PASSWORD?: string;

  @IsOptional()
  @IsString()
  DATABASE_NAME?: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  API_URL?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  PORT?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  WEATHER_PROVIDER?: string;

  @IsOptional()
  @IsString()
  OPENWEATHERMAP_API_KEY?: string;
}

export class TelegramEnvironmentVariables extends EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'TELEGRAM_BOT_TOKEN is required' })
  TELEGRAM_BOT_TOKEN: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

export function validateTelegram(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(TelegramEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
