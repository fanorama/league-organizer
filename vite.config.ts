import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'football-api-dev-proxy',
      configureServer(server) {
        const env = loadEnv(server.config.mode, process.cwd(), '');
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/football')) {
            next();
            return;
          }

          const apiKey = process.env.FOOTBALL_API_KEY || env.FOOTBALL_API_KEY;
          res.setHeader('content-type', 'application/json');
          if (!apiKey) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'API key not configured' }));
            return;
          }

          const url = new URL(req.url, 'http://localhost');
          const competition = url.searchParams.get('competition');
          const season = url.searchParams.get('season');
          let upstreamUrl = `https://api.football-data.org/v4/competitions/${competition}/teams`;
          if (season) upstreamUrl += `?season=${season}`;
          const upstream = await fetch(upstreamUrl, {
            headers: { 'X-Auth-Token': apiKey },
          });
          res.statusCode = upstream.status;
          res.end(await upstream.text());
        });
      },
    },
    {
      name: 'crest-dev-proxy',
      configureServer(server) {
        const ALLOWED_HOSTS = new Set(['crests.football-data.org']);
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/crest')) {
            next();
            return;
          }
          const target = new URL(req.url, 'http://localhost').searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }
          let parsed: URL;
          try {
            parsed = new URL(target);
          } catch {
            res.statusCode = 400;
            res.end('Invalid url');
            return;
          }
          if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
            res.statusCode = 400;
            res.end('Host not allowed');
            return;
          }
          if (parsed.pathname.endsWith('.svg')) {
            parsed.pathname = parsed.pathname.replace(/\.svg$/, '.png');
          }
          const upstream = await fetch(parsed.toString());
          res.statusCode = upstream.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('content-type', upstream.headers.get('content-type') || 'image/png');
          res.end(Buffer.from(await upstream.arrayBuffer()));
        });
      },
    },
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'api/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/store/**'],
    },
  },
});
