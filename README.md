# Windline

Telegram bot for route-specific weather and wind analysis.

Upload a GPX file, set date and start time — get an infographic with route map, weather forecast, and wind breakdown (headwind/tailwind/crosswind).

## Stack

- NestJS + TypeScript
- PostgreSQL + Redis
- Telegraf

## Run

```bash
pnpm install
pnpm dev
```

## Environment variables

```
TELEGRAM_BOT_TOKEN=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
REDIS_HOST=
REDIS_PORT=
```
