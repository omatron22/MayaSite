import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const signId = parseInt(String(id));

  if (isNaN(signId)) {
    return res.status(400).json({ error: 'Invalid sign ID' });
  }

  try {
    const [signResult, graphemeResult, roboflowResult] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM catalog_signs WHERE id = ?',
        args: [signId],
      }),
      db.execute({
        sql: `
          SELECT
            g.id,
            g.grapheme_code,
            b.block_english,
            b.block_maya1,
            b.artifact_code,
            b.event_calendar,
            b.block_image1_url as block_img
          FROM graphemes g
          LEFT JOIN blocks b ON g.block_id = b.id
          WHERE g.catalog_sign_id = ?
          ORDER BY b.event_calendar DESC
          LIMIT 100
        `,
        args: [signId],
      }),
      db.execute({
        sql: `
          SELECT id, image_url, bbox_x, bbox_y, bbox_width, bbox_height, confidence, dataset_split
          FROM roboflow_instances
          WHERE catalog_sign_id = ?
          LIMIT 50
        `,
        args: [signId],
      }),
    ]);

    if (signResult.rows.length === 0) {
      return res.status(404).json({ error: `No sign found with ID: ${signId}` });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      sign: signResult.rows[0],
      graphemes: graphemeResult.rows,
      roboflow: roboflowResult.rows,
    });
  } catch (err) {
    console.error('Sign detail error:', err);
    return res.status(500).json({ error: 'Failed to load sign', details: String(err) });
  }
}
