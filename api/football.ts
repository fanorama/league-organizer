import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { competition, season } = req.query;
  let upstreamUrl = `https://api.football-data.org/v4/competitions/${competition}/teams`;
  if (season) upstreamUrl += `?season=${season}`;
  const upstream = await fetch(upstreamUrl, {
    headers: { 'X-Auth-Token': apiKey },
  });
  const data = await upstream.json();
  return res.status(upstream.status).json(data);
}
