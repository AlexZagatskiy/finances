import Fastify, { type FastifyError } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Decimal } from 'decimal.js';
import { RateProvider, type ProviderOptions } from './provider.ts';
import { ServiceError } from './cache.ts';
import { defaults, popularCodes } from './metadata.ts';
import cors from '@fastify/cors';

// 40 significant digits avoids binary floating point and repeated display rounding.
const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export interface ConversionInput {
  source: string;
  target: string;
  amount: string;
  side: 'source' | 'target';
  mode: 'market' | 'official';
  bank?: string;
}
interface AppOptions extends ProviderOptions {
  countryHeader?: string;
  defaultCountry?: string;
  logger?: boolean;
}

const defaultOrigins = [
  'http://localhost:4200',
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : defaultOrigins;

export function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 2048 });
  const provider = new RateProvider(options);

  app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400, // browsers cache the preflight result for 24h
  });

  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error instanceof ServiceError)
      return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    if (error.validation)
      return reply
        .code(400)
        .send({
          code: 'INVALID_INPUT',
          message: 'Check the currencies and enter a positive amount with up to 12 decimal places.',
        });
    if (error.statusCode === 429)
      return reply
        .code(429)
        .send({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please wait a minute and try again.',
        });
    // Do not serialize upstream bodies, URLs, keys or request amounts to logs.
    return reply
      .code(500)
      .send({ code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' });
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.get('/api/bootstrap', async (request) => {
    const header = options.countryHeader
      ? request.headers[options.countryHeader.toLowerCase()]
      : undefined;
    const selected = defaults(typeof header === 'string' ? header : options.defaultCountry);
    const currencies = await provider.currencies();
    const supported = new Set(currencies.map((c) => c.code));
    if (!supported.has(selected.source)) {
      selected.source = 'PLN';
      selected.target = 'USD';
    }
    return {
      ...selected,
      currencies: currencies.filter(
        (c) => popularCodes.includes(c.code) || [selected.source, selected.target].includes(c.code),
      ),
      popularCodes,
    };
  });

  app.get('/api/currencies', async () => ({ currencies: await provider.currencies() }));

  app.get('/api/banks', async () => ({ banks: await provider.banks() }));

  app.post<{ Body: ConversionInput }>(
    '/api/convert',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['source', 'target', 'amount', 'side', 'mode'],
          properties: {
            source: { type: 'string', pattern: '^[A-Z]{3}$' },
            target: { type: 'string', pattern: '^[A-Z]{3}$' },
            amount: { type: 'string', pattern: '^(0|[1-9][0-9]{0,14})(\\.[0-9]{1,12})?$' },
            side: { enum: ['source', 'target'] },
            mode: { enum: ['market', 'official'] },
            bank: { type: 'string', pattern: '^[a-z0-9_-]{2,24}$' },
          },
        },
      },
    },

    async (request) => {
      const { source, target, mode, side, amount, bank } = request.body;
      const currencies = await provider.currencies();
      const from = currencies.find((c) => c.code === source);
      const to = currencies.find((c) => c.code === target);
      if (!from || !to)
        throw new ServiceError(
          400,
          'UNSUPPORTED_CURRENCY',
          'Choose a supported currency from the list.',
        );
      if (
        mode === 'official' &&
        (!bank || !(await provider.banks()).some((b) => b.code === bank))
      ) {
        throw new ServiceError(400, 'BANK_REQUIRED', 'Choose a central bank.');
      }
      const quote =
        source === target
          ? {
              rate: '1',
              asOf: null,
              fetchedAt: null,
              dateOnly: false,
              stale: false,
              derived: false,
              bank: null,
            }
          : await provider.quote(source, target, mode, bank);
      const exact =
        side === 'source' ? new Money(amount).times(quote.rate) : new Money(amount).div(quote.rate);
      const digits = side === 'source' ? to.digits : from.digits;
      return {
        ...quote,
        source,
        target,
        mode,
        side,
        amount,
        result: exact.toFixed(digits),
        exactResult: exact.toFixed(),
        digits,
        identity: source === target,
      };
    },
  );
  return app;
}
