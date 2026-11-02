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

### App updates

Installed apps can remain open on a cached release after a deployment. The app checks for updates after startup stabilizes, whenever it returns to the foreground or reconnects, and every 15 minutes while visible. Once the new release has downloaded, a **Reload to update** notice appears. Reloading switches all app files together and clears current calculator inputs. Offline use continues with the cached release; failed checks retry later.

Angular generates `ngsw.json` with content hashes during each production build, so manual cache version bumps or clearing all caches are unnecessary. Deploy the entire production build together, including `ngsw.json` and `ngsw-worker.js`. On hosts with configurable headers, require revalidation (`Cache-Control: no-cache`) for these two files and `index.html`; hashed JavaScript and CSS can be cached long-term. The current GitHub Pages workflow deploys a complete build artifact and does not support custom response headers.

To verify updates, keep production preview open and controlled by its service worker, change some visible text, and build again. Return to the preview after switching away: the update notice should appear once the new release finishes downloading. Choose **Reload to update** and verify the changed text and route navigation. Check offline navigation again after the update. For an installation made before this update flow existed, fully close all app windows and reopen online, allow the new release to download, then close and reopen once more to pick it up.

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

## Tailwind CSS MCP

The shared [MCP configuration](.ai/mcp/mcp.json) includes the community-maintained
[@clarity-contrib/tailwindcss-mcp-server](https://github.com/clarity-contrib/tailwindcss-mcp-server),
pinned to version 1.1.1. It provides utility lookup, documentation search, and CSS-to-Tailwind conversion
with Tailwind v4 support. It is not an official Tailwind Labs server.

In WebStorm's AI Assistant MCP settings, enable the server from the project configuration (or import
the configuration if it is not loaded automatically), then start a new agent session to expose its tools.
The server runs through `npx`, requires network access on first launch, and needs no API key.
Use the project's supported Node.js version from Local development above.

Request `version: "v4"` when using its tools, and adapt returned classes to this project's `tw:` prefix.
