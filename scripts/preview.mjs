import { createServer, request as proxyRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Local production preview with SPA fallback; not a deployment server.
const root = resolve('dist/finances/browser');
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

try {
  await readFile(resolve(root, 'index.html'));
} catch {
  console.error('Production build missing. Run npm run build first.');
  process.exit(1);
}

createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    const upstream = proxyRequest(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
      (incoming) => {
        response.writeHead(incoming.statusCode ?? 502, incoming.headers);
        incoming.pipe(response);
      },
    );
    upstream.setTimeout(10000, () => upstream.destroy());
    upstream.on('error', () => {
      if (!response.headersSent)
        response.writeHead(502, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
      response.end(
        JSON.stringify({
          message: 'The finance API is unavailable. Start it with npm run api:dev.',
        }),
      );
    });
    request.pipe(upstream);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let body;
    let extension = extname(file);
    if (!extension && request.headers.accept?.includes('text/html')) {
      body = await readFile(resolve(root, 'index.html'));
      extension = '.html';
    } else {
      body = await readFile(file);
    }
    response.writeHead(200, {
      'Content-Type': types[extension] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Production preview: http://localhost:${port}`);
});
