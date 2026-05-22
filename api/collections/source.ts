import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db.js';

// Generic collection endpoint for source_items.
// Query: ?collection=schele-lacma|famsi-montgomery
//        ?q= (search by title/description/site)
//        ?site= (filter by site_name)
//        ?page= ?pageSize=
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const collection = String(req.query.collection || '').trim();
  if (!collection) return res.status(400).json({ error: 'collection param required' });

  const q = String(req.query.q || '').trim().toLowerCase();
  const site = String(req.query.site || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '48'))));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['collection_id = ?'];
  const args: (string | number)[] = [collection];
  if (q) {
    conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(site_name) LIKE ? OR LOWER(external_id) LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }
  if (site) {
    conditions.push('site_name = ?');
    args.push(site);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    const [countRes, rowsRes, collRes] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) AS n FROM source_items ${where}`, args }),
      db.execute({
        sql: `SELECT item_id, external_id, title, creator, site_name, period, culture,
                     material, dimensions, description, image_url, thumb_url,
                     source_url, rights_note, object_number
              FROM source_items
              ${where}
              ORDER BY site_name, external_id
              LIMIT ? OFFSET ?`,
        args: [...args, pageSize, offset],
      }),
      db.execute({
        sql: `SELECT collection_id, title, provider, source_url, rights_note FROM source_collections WHERE collection_id = ?`,
        args: [collection],
      }),
    ]);

    // Top sites for the collection (cached cheaply)
    const sitesRes = await db.execute({
      sql: `SELECT site_name, COUNT(*) AS n FROM source_items
            WHERE collection_id = ? AND site_name IS NOT NULL AND site_name != ''
            GROUP BY site_name ORDER BY n DESC LIMIT 25`,
      args: [collection],
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      collection: collRes.rows[0] || null,
      results: rowsRes.rows,
      total: Number(countRes.rows[0].n),
      sites: sitesRes.rows,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Source collection error:', err);
    return res.status(500).json({ error: 'Failed', details: String(err) });
  }
}
