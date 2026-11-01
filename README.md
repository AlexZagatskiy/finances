# Finances

A small Angular PWA for practising frontend development. Includes a responsive Material shell, a currency converter backed by a separate Fastify API, and placeholder mortgage and bond pages.

## Local development

Use a supported Node.js version: `^22.22.3`, `^24.15.0`, or `>=26.0.0`. The repository's `.nvmrc` selects Node 24.

```sh
nvm use
npm ci
npm run api:dev  # separate terminal; configure services/api/.env first
npm start
```

See [Finance API setup](services/api/README.md) for the API key, location detection, caching, and production hosting.

Open http://localhost:4200. The development server refreshes the page when source files change. The service worker is enabled only in production.

```sh
npm test -- --watch=false
npm run build
npm run preview
```

The production preview runs at http://localhost:4173 and supports direct navigation to Angular routes. Set `PORT` to change the port. Build again and reload after editing; preview does not rebuild automatically.

## Stack and structure

- Angular 22, standalone components, OnPush change detection, and lazy routes using `loadComponent`.
- Angular Material 22: navigation drawer, navigation items, icon buttons, cards, and Material theming.
- Tailwind CSS 4 with the `tw:` prefix, for example `tw:flex` and `tw:md:gap-6`.
- Angular service worker, web app manifest, and local icons for PWA support.

```text
src/app/
  app.*                    Application shell, configuration, and routes
  features/
    currency/currency.ts   /currency (also the root and unknown-route fallback)
    mortgage/mortgage.ts   /mortgage
    bonds/bonds.ts         /bonds
  shared/
    feature-placeholder.ts Shared placeholder presentation
    icons.ts               Bundled SVG icons
src/material-theme.scss    Material theme and supported token overrides
src/styles.scss             Prefixed Tailwind and global styles
public/                    Manifest, favicon, and install icons
ngsw-config.json           Offline asset caching
scripts/preview.mjs         Local production preview server
```

Material supplies component styles and interaction effects. Tailwind supplies layout and spacing. Fonts and icons require no external requests.

## Verify the PWA

1. Run `npm run build` and `npm run preview`.
2. Open the preview in a regular browser window, preferably a fresh browser profile to avoid older service workers.
3. Visit all three routes. In browser DevTools → Application, check the manifest, icons, and activated service worker. Reload once if the page is not yet controlled by the worker.
4. In DevTools → Network, select **Offline**, then navigate among the pages and reload a route. The cached application should still display.
5. Restore the network. In supporting browsers, use the browser's install action to install the application. Installation UI depends on browser and platform.

All application JavaScript is prefetched by the production service worker, including lazy route chunks. Angular still loads feature components on demand. A first-ever offline visit cannot load the app; an initial online visit and completed service worker installation are required.

Production hosting must use HTTPS and serve `index.html` for application routes. Serve missing asset files as 404 responses. Localhost is accepted as a secure context for development. The included preview server binds only to the local machine and is not intended for deployment.

## Angular MCP

The official Angular CLI MCP is required for Angular development by AGENTS.md, configured through your IDE, with this project as its working directory:

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli@latest", "mcp"]
    }
  }
}
```

See [Angular MCP documentation](https://angular.dev/ai/mcp). The iteration scope is recorded in [ITERATION-1.md](ITERATION-1.md).
