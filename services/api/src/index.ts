import { buildApp } from './app.ts';

const ttl = Number(process.env['RATE_TTL_SECONDS'] ?? 60);

if (!Number.isFinite(ttl) || ttl < 60 || ttl > 3600)
  throw new Error('RATE_TTL_SECONDS must be between 60 and 3600.');

const app = buildApp({
  apiKey: process.env['ALLRATESTODAY_API_KEY'],
  countryHeader: process.env['TRUSTED_COUNTRY_HEADER'],
  defaultCountry: process.env['DEFAULT_COUNTRY'],
  marketTtl: ttl * 1000,
  logger: true,
});

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close();
  });

await app.listen({
  port: Number(process.env['API_PORT'] ?? process.env['PORT'] ?? 3001),
  host: process.env['API_HOST'] ?? '127.0.0.1',
});
