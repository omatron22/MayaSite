import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const total = (countResult.rows[0] as { total: number }).total;

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
