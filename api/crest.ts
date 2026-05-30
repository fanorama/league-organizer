import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_HOSTS = new Set(['crests.football-data.org']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.url;
  const target = Array.isArray(raw) ? raw[0] : raw;
  if (!target) return res.status(400).json({ error: 'Missing url parameter' });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(400).json({ error: 'Host not allowed' });
  }
  // Sibling .png selalu tersedia di CDN football-data; hindari rasterisasi SVG.
  if (parsed.pathname.endsWith('.svg')) {
    parsed.pathname = parsed.pathname.replace(/\.svg$/, '.png');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const upstream = await fetch(parsed.toString(), { signal: controller.signal });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream error' });
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ error: 'Failed to fetch crest' });
  } finally {
    clearTimeout(timeout);
  }
}
