import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await db.execute(`
      SELECT
        site_name,
        region,
        COUNT(*) as block_count,
        COUNT(DISTINCT artifact_code) as artifact_count,
        GROUP_CONCAT(DISTINCT artifact_code) as artifact_codes
      FROM blocks
      WHERE site_name IS NOT NULL AND site_name != ''
      GROUP BY site_name, region
      ORDER BY block_count DESC
    `);

    const sites = result.rows.map(row => ({
      name: String(row.site_name),
      region: String(row.region || 'Unknown'),
      blockCount: Number(row.block_count),
      artifactCount: Number(row.artifact_count),
      artifactCodes: String(row.artifact_codes || ''),
    }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ sites });
  } catch (err) {
    console.error('Map sites error:', err);
    return res.status(500).json({ error: 'Failed to load map data', details: String(err) });
  }
}
