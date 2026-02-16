import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const codesRaw = String(req.query.codes || '');
  if (!codesRaw) {
    return res.status(400).json({ error: 'Missing codes parameter' });
  }

  const codes = codesRaw.split(',').map(c => c.trim()).filter(Boolean).slice(0, 100);
  if (codes.length === 0) {
    return res.status(200).json({ signs: {} });
  }

  try {
    const placeholders = codes.map(() => '?').join(',');
    const result = await db.execute({
      sql: `SELECT id, mhd_code, mhd_code_sub, graphcode, primary_image_url
            FROM catalog_signs
            WHERE graphcode IN (${placeholders})
               OR mhd_code IN (${placeholders})
               OR mhd_code_sub IN (${placeholders})`,
      args: [...codes, ...codes, ...codes],
    });

    const signs: Record<string, { id: number; display_code: string; primary_image_url: string | null }> = {};

    for (const row of result.rows) {
      const r = row as { id: number; mhd_code: string; mhd_code_sub: string | null; graphcode: string | null; primary_image_url: string | null };
      const displayCode = r.mhd_code_sub || r.graphcode || r.mhd_code;
      // Map all matching code variants to this sign
      for (const code of codes) {
        if (r.graphcode === code || r.mhd_code === code || r.mhd_code_sub === code) {
          signs[code] = { id: r.id, display_code: displayCode, primary_image_url: r.primary_image_url };
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ signs });
  } catch (err) {
    console.error('Sign lookup error:', err);
    return res.status(500).json({ error: 'Lookup failed', details: String(err) });
  }
}
