import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const site = String(req.query.site || '').trim();
  const type = String(req.query.type || '').trim();
  const monument = String(req.query.monument || '').trim();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (site) {
    conditions.push('(site_code = ? OR site_name LIKE ?)');
    args.push(site.toUpperCase(), `%${site}%`);
  }

  if (type) {
    conditions.push('image_type = ?');
    args.push(type);
  }

  if (monument) {
    conditions.push('(monument_type LIKE ? OR monument_number = ?)');
    args.push(`%${monument}%`, monument);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await db.execute({
      sql: `SELECT * FROM cmhi_images ${where} ORDER BY site_name, monument_type, monument_number LIMIT 200`,
      args,
    });

    // Also return site summary
    const siteSummary = await db.execute(`
      SELECT site_name, site_code, image_type, COUNT(*) as count
      FROM cmhi_images
      GROUP BY site_name, site_code, image_type
      ORDER BY site_name
    `);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      images: result.rows,
      sites: siteSummary.rows,
    });
  } catch (err) {
    console.error('CMHI error:', err);
    return res.status(500).json({ error: 'Failed to load CMHI data', details: String(err) });
  }
}
