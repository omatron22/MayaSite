import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const source = String(req.query.source || '');

  if (source === 'kerr') {
    return handleKerr(req, res);
  } else if (source === 'cmhi') {
    return handleCmhi(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid source. Use ?source=kerr or ?source=cmhi' });
  }
}

async function handleKerr(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '48'))));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (q) {
    conditions.push('(k_number LIKE ? OR description LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [dataResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT id, k_number, k_num, description, image_url, still_url
              FROM kerr_vessels ${where}
              ORDER BY k_num
              LIMIT ? OFFSET ?`,
        args: [...args, pageSize, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM kerr_vessels ${where}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].total);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      results: dataResult.rows,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Kerr search error:', err);
    return res.status(500).json({ error: 'Failed to search Kerr vessels', details: String(err) });
  }
}

async function handleCmhi(req: VercelRequest, res: VercelResponse) {
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
