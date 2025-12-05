import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'windline',
  password: process.env.DATABASE_PASSWORD || 'windline',
  database: process.env.DATABASE_NAME || 'windline',
}));
