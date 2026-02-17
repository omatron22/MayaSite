import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const graphemeId = parseInt(String(id));

  if (isNaN(graphemeId)) {
    return res.status(400).json({ error: 'Invalid grapheme ID' });
  }

  try {
    const result = await db.execute({
      sql: `
        SELECT
          g.*,
          b.mhd_block_id,
          b.artifact_code,
          b.block_maya1,
          b.block_english,
          b.event_calendar,
          b.event_long_count,
          b.surface_page,
          b.region,
          b.site_name,
          cs.id as catalog_sign_id,
          cs.graphcode,
          cs.primary_image_url,
          cs.mhd_code,
          cs.mhd_code_sub,
          cs.mhd_code_2003,
          cs.thompson_code,
          cs.thompson_variant,
          cs.zender_code,
          cs.kettunen_code,
          cs.gronemeyer_code,
          cs.syllabic_value,
          cs.logographic_value,
          cs.logographic_cvc,
          cs.english_translation,
          cs.word_class,
          cs.technique as sign_technique,
          cs.distribution,
          cs.picture_description,
          cs.bonn_sign_number,
          cs.bonn_confidence,
          cs.bonn_image_url
        FROM graphemes g
        LEFT JOIN blocks b ON g.block_id = b.id
        LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
        WHERE g.id = ?
      `,
      args: [graphemeId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No grapheme found with ID: ${graphemeId}` });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Grapheme detail error:', err);
    return res.status(500).json({ error: 'Failed to load grapheme', details: String(err) });
  }
}
