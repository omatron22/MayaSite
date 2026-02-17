import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db';

const VALID_SORT_COLUMNS = ['mhd_code', 'graphcode', 'thompson_code', 'zender_code', 'kettunen_code', 'gronemeyer_code', 'syllabic_value', 'english_translation', 'bonn_sign_number'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
  const sortBy = VALID_SORT_COLUMNS.includes(String(req.query.sortBy)) ? String(req.query.sortBy) : 'mhd_code';
  const sortDir = String(req.query.sortDir) === 'desc' ? 'DESC' : 'ASC';
  const hasThompson = req.query.hasThompson === 'true';
  const hasZender = req.query.hasZender === 'true';
  const hasKettunen = req.query.hasKettunen === 'true';
  const hasGronemeyer = req.query.hasGronemeyer === 'true';

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (q) {
    conditions.push(`(mhd_code LIKE ? OR graphcode LIKE ? OR thompson_code LIKE ? OR zender_code LIKE ? OR kettunen_code LIKE ? OR gronemeyer_code LIKE ? OR syllabic_value LIKE ? OR english_translation LIKE ? OR CAST(bonn_sign_number AS TEXT) LIKE ?)`);
    const like = `%${q}%`;
    args.push(like, like, like, like, like, like, like, like, like);
  }

  if (hasThompson) conditions.push('thompson_code IS NOT NULL');
  if (hasZender) conditions.push('zender_code IS NOT NULL');
  if (hasKettunen) conditions.push('kettunen_code IS NOT NULL');
  if (hasGronemeyer) conditions.push('gronemeyer_code IS NOT NULL');

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  try {
    const [dataResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT id, mhd_code, graphcode, primary_image_url, thompson_code, zender_code, kettunen_code, gronemeyer_code, syllabic_value, english_translation, bonn_sign_number
              FROM catalog_signs ${where}
              ORDER BY ${sortBy} ${sortDir}
              LIMIT ? OFFSET ?`,
        args: [...args, pageSize, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM catalog_signs ${where}`,
        args,
      }),
    ]);

    const total = (countResult.rows[0] as { total: number }).total;

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      rows: dataResult.rows,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Concordance error:', err);
    return res.status(500).json({ error: 'Failed to load concordance data', details: String(err) });
  }
}
