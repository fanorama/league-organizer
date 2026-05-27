import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { league, season } = req.query;
  const upstream = await fetch(`https://v3.football.api-sports.io/teams?league=${league}&season=${season}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const data = await upstream.json();
  return res.status(upstream.status).json(data);
}
