# Agent Instructions

## Angular Development

For Angular development, use the configured Angular MCP server to verify current framework APIs,
recommended patterns, and best practices when relevant. Respect the project's installed Angular version
and existing conventions.

The Angular MCP server is required for Angular development. If it is unavailable, display a clear
warning that Angular work is blocked, explain the availability issue, and stop Angular work until
access is restored. Do not silently fall back to assumptions or other sources.

## Financial Backend Development

For backend development involving monetary amounts, including currency conversion, mortgage
calculations, and bonds:

- Handle currency codes, monetary precision, and rounding explicitly.
- Read and follow [Currency Exchange Rates](docs/currency_exchange_rates.md) when implementing,
  modifying, debugging, or testing currency conversion, exchange-rate retrieval or storage, or other
  FX-dependent behavior.
- Mortgage and bond calculations that do not depend on exchange rates do not require AllRatesToday
  MCP access. Their interest rates, yields, repayment schedules, and valuation rules are separate from
  currency exchange rates.
