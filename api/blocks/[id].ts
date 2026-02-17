import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const blockId = parseInt(String(id));

  if (isNaN(blockId)) {
    return res.status(400).json({ error: 'Invalid block ID' });
  }

  try {
    const [blockResult, graphemesResult] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM blocks WHERE id = ?',
        args: [blockId],
      }),
      db.execute({
        sql: `
          SELECT
            g.*,
            cs.graphcode,
            cs.primary_image_url,
            cs.syllabic_value,
            cs.english_translation
          FROM graphemes g
          LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
          WHERE g.block_id = ?
          ORDER BY g.id
        `,
        args: [blockId],
      }),
    ]);

    if (blockResult.rows.length === 0) {
      return res.status(404).json({ error: `No block found with ID: ${blockId}` });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      block: blockResult.rows[0],
      graphemes: graphemesResult.rows,
    });
  } catch (err) {
    console.error('Block detail error:', err);
    return res.status(500).json({ error: 'Failed to load block', details: String(err) });
  }
}
