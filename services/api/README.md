# Finance API

A separate Fastify service for provider calls, rate caching, and decimal calculations. Requires Node 24.15+; dependencies are installed through the root npm workspace.

```sh
# From the repository root, after npm install
cp services/api/.env.example services/api/.env
# Set ALLRATESTODAY_API_KEY in services/api/.env
npm run api:dev
# In a second terminal
npm start
```

The API listens on `127.0.0.1:3001`. Angular proxies `/api/**` to it. `npm run api:start` runs without file watching. `npm run api:test` runs deterministic tests with mocked provider data; `npm run api:check` checks TypeScript. The server executes TypeScript using Node's native type stripping.

## Routes

- `GET /api/health` — process health.
- `GET /api/bootstrap` — detected country defaults and ten favorite currencies, plus the detected currency if needed.
- `GET /api/currencies` — full provider catalogue, with flag and currency minor-unit metadata.
- `GET /api/banks` — central banks from the provider catalogue.
- `POST /api/convert` — `{ source, target, amount, side, mode, bank? }`. `amount` is a decimal string; `side` is `source` or `target`, indicating which amount to preserve; `mode` is `market` or `official`. Official mode requires a bank code.

Conversion responses contain decimal strings (`rate`, `result`, `exactResult`), currency codes, observation/publication date (`asOf`), fetch time (`fetchedAt`), and stale/derived flags. `result` is rounded half-up to the receiving currency's ISO minor-unit precision. Decimal arithmetic uses 40 significant digits. Inputs allow zero, up to 15 whole digits and 12 fractional digits. Rate precision is retained as supplied by the provider. Same-currency conversions return 1:1 without an upstream quote.

## Location and hosting

Country detection uses a country header supplied by your hosting platform. Set `TRUSTED_COUNTRY_HEADER=cf-ipcountry` for a Cloudflare deployment, or your platform's equivalent. Enable this only behind a proxy that overwrites the header and prevents direct public access to the origin. It is disabled by default; arbitrary client headers do not influence defaults. `DEFAULT_COUNTRY=PL` is available for local testing. No precise coordinates are requested or stored.

Unknown location/currency falls back to PLN → USD. Detected USD targets EUR. Other detected currencies target USD. The publishing bank is initialized from the detected country; when none is covered, the UI asks the user to choose. Changing currencies or swapping does not change the bank.

In production, route `/api/*` to this service and other requests to the built Angular app under the same HTTPS origin. The included Angular proxy is development-only. The local preview script also forwards `/api/*` to `127.0.0.1:3001`; it is not a production server. Set `API_HOST=0.0.0.0` only when needed by a container or hosting platform. Keep the API key in the host's secret store, outside the frontend build and git.

## Cache policy

Cache keys include rate mode, bank (official mode), and the ordered currency pair. Amount changes reuse the rate. Concurrent misses for a key share one request; cache size is bounded to 1,000 entries. The cache is in memory and resets on restart. Multiple API replicas should use a shared cache such as Redis before scaling.

- Market rates: 60 seconds by default; `RATE_TTL_SECONDS` accepts 60–3600.
- Official quotes: on-demand checks at most hourly, earlier at the next `available_by_utc` publication time. The date supplied by the bank is preserved over weekends and holidays.
- Currency and bank catalogues: 24-hour freshness, with up to seven days of cached metadata during outages.
- Quote refresh failure: fallback for up to one hour since a successful market fetch, or one day for official quotes, explicitly marked stale. An overdue provider observation is also marked stale. Unsupported pairs never silently switch sources.
- Failed requests have a 30-second per-key cooldown. Upstream quota exhaustion blocks further authenticated provider calls for one hour; requests may still use suitable cached data. No background polling consumes quota.

The HTTP API uses `Cache-Control: no-store`; the PWA does not persist conversion responses. Public requests are limited to 120 per minute per directly connected IP. Configure a trusted proxy/IP strategy and shared limiter for production traffic as needed.

## Sources and attribution

Production uses [AllRatesToday's REST API](https://allratestoday.com/docs); MCP is development tooling only. The page includes the required visible AllRatesToday attribution and link, with the publishing bank and date beside official results.

Flags are from [flag-icons](https://flagicons.lipis.dev/) (MIT), bundled from the npm package. Country/currency metadata uses [world-countries](https://github.com/mledoze/countries) under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1.0/), with explicit corrections and representative flag mappings in `metadata.ts`. Minor units come from Node's ICU currency data. Currency catalogues may include legacy codes; recognition does not guarantee a currently available quote.
