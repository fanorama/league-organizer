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
