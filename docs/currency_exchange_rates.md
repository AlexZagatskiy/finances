# Currency Exchange Rates

## Scope

This guide applies to backend currency conversion, exchange-rate retrieval or storage, and other
FX-dependent behavior, including any such functionality within mortgage or bond features.

Mortgage and bond calculations that do not depend on exchange rates do not require AllRatesToday MCP
access. Interest rates, yields, repayment schedules, and valuation rules are outside this guide's
scope.

## Development Guidelines

When implementing, modifying, debugging, or testing functionality within this guide's scope:

- Use the configured AllRatesToday MCP server to retrieve and verify exchange-rate information when
  relevant.
- Prefer MCP tools over assumptions or hardcoded exchange-rate values.
- Use ISO 4217 currency codes (`USD`, `EUR`, `GBP`, etc.).
- Handle currency precision, rounding, timestamps, and missing rates appropriately.
- Use mocked exchange rates for automated tests to ensure deterministic results.
- If the MCP server is unavailable, do not invent exchange-rate data.

## MCP Integration

- **Provider:** AllRatesToday
- **MCP server:** `allratestoday`
- **Website:** [AllRatesToday](https://allratestoday.com/)

The MCP server is intended for development-time assistance. Production backend integrations should use
the application's configured exchange-rate API rather than relying on the coding agent's MCP
connection.
