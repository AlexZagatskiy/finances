# Iteration 1: Angular PWA foundation

## Goal

Create a mobile-friendly application shell for a small finance learning project. This iteration provides navigation and three placeholder pages; calculations and external data come later.

## Agreed stack

- Latest stable Angular and compatible Angular CLI, with TypeScript and standalone components.
- Angular Router with lazy-loaded feature components using `loadComponent`.
- Angular Material from the beginning for navigation, menus, buttons, and future form controls, including its built-in interaction effects.
- Latest stable Tailwind CSS for layout and spacing, configured with `@import "tailwindcss" prefix(tw);` so utilities use `tw:` (for example, `tw:flex` and `tw:md:gap-6`).
- Angular PWA support through `@angular/pwa`.
- Official Angular CLI MCP as development tooling, connected through the IDE.

Use Angular Material theming for component appearance and Tailwind for surrounding layout. Verify compatible Node.js and TypeScript versions when scaffolding; the current package.json is only a minimal TypeScript setup.

## Implementation steps

1. Scaffold the Angular application in this repository and configure development and production build scripts.
2. Install and configure Angular Material with a consistent application theme.
3. Integrate Tailwind with the `tw:` prefix and verify it works alongside Material styles.
4. Build a responsive app shell with a header, Material navigation, active route indication, and a main content area. Make navigation usable on narrow mobile screens and with a keyboard.
5. Create separate standalone placeholder components and lazy-loaded routes:
   - `/currency` — Currency converter.
   - `/mortgage` — Mortgage calculator.
   - `/bonds` — Bonds calculator.
6. Redirect the root route to `/currency` and provide a fallback for unknown routes.
7. Add PWA configuration, a web app manifest, application icons, and service worker caching for the application shell and placeholder pages.
8. Document how to run, build, and preview the production PWA locally.

## Scope boundaries

- All three features are placeholders in this iteration, including the currency converter.
- No calculations, mock exchange rates, API integration, authentication, or saved scenarios yet.
- No backend, database, or shared data cache yet.
- The later architecture will use a backend to keep provider API keys private and cache exchange rates across users. The frontend may retain the latest rates for offline use and display their timestamp.
- Fastify and SQLite are proposed backend choices for later; Redis is unnecessary initially.

## Acceptance criteria

- The application starts locally and its production build succeeds.
- Each feature is reachable through navigation and its component loads lazily.
- All three pages clearly identify the feature and indicate that it is coming later.
- Layout and navigation work on mobile and desktop, including keyboard focus and accessible navigation labels.
- Material components and prefixed Tailwind utilities both render correctly.
- The production application registers its service worker and exposes a valid manifest and icons.
- After an initial online visit, cached pages can be opened offline; verify all three routes after visiting them online.
- Installation is available in supporting browsers when served in a secure context (HTTPS, or localhost for development).
- The README contains local development, production preview, and PWA verification instructions.

## Development tooling

Configure the official Angular CLI MCP in the IDE with command `npx`, arguments `-y @angular/cli@latest mcp`, and this repository as its working directory. It supports development only and is not a runtime dependency of the application.

- Angular MCP: https://angular.dev/ai/mcp
- Angular PWA setup: https://angular.dev/ecosystem/service-workers/getting-started
- Tailwind prefix configuration: https://tailwindcss.com/docs/styling-with-utility-classes#using-the-prefix-option
