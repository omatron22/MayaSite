import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../lib/db.js';

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
            g.block_id,
            g.grapheme_code,
            b.block_english,
            b.transcription_1,
            b.transcription_logosyll,
            b.artifact_code,
            b.event_calendar,
            b.event_long_count,
            b.event_gregorian,
            b.site_name,
            b.region,
            b.semantic_context,
            b.mhd_block_id,
            b.coordinate,
            b.surface_page,
            b.orientation_frame,
            COALESCE(b.block_image1_url, b.block_image2_url) as block_img
          FROM graphemes g
          LEFT JOIN blocks b ON g.block_id = b.id
          WHERE g.catalog_sign_id = ?
          ORDER BY b.event_calendar DESC
          LIMIT 200
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

    // Find prev/next signs by id
    let prevSign: { id: number; code: string } | null = null;
    let nextSign: { id: number; code: string } | null = null;
    try {
      const [prevResult, nextResult] = await Promise.all([
        db.execute('SELECT id, COALESCE(mhd_code_sub, graphcode, mhd_code) as code FROM catalog_signs WHERE id < ? ORDER BY id DESC LIMIT 1', [signId]),
        db.execute('SELECT id, COALESCE(mhd_code_sub, graphcode, mhd_code) as code FROM catalog_signs WHERE id > ? ORDER BY id ASC LIMIT 1', [signId]),
      ]);
      if (prevResult.rows.length > 0) prevSign = { id: Number(prevResult.rows[0].id), code: String(prevResult.rows[0].code) };
      if (nextResult.rows.length > 0) nextSign = { id: Number(nextResult.rows[0].id), code: String(nextResult.rows[0].code) };
    } catch { /* non-critical */ }

    // Fetch concordance data if catalog_entries exist for this sign
    let crossRefs: unknown[] = [];
    let graphs: unknown[] = [];
    try {
      const [crossRefResult, graphsResult] = await Promise.all([
        db.execute({
          sql: `SELECT ce2.entry_id, ce2.catalog, ce2.catalog_code,
                       ce2.reading_value, ce2.gloss_english, ce2.part_of_speech,
                       ce2.confidence_level, ce2.image_url as entry_image_url,
                       cl.correspondence, cl.asserted_by
                FROM catalog_entries ce1
                JOIN concordance_links cl ON (cl.entry_a = ce1.entry_id OR cl.entry_b = ce1.entry_id)
                JOIN catalog_entries ce2 ON ce2.entry_id = CASE
                  WHEN cl.entry_a = ce1.entry_id THEN cl.entry_b ELSE cl.entry_a END
                WHERE ce1.legacy_catalog_sign_id = ?
                ORDER BY ce2.catalog, ce2.catalog_code`,
          args: [signId],
        }),
        db.execute({
          sql: `SELECT g.graph_id, g.variant_suffix, g.variant_type_label, g.medium, g.image_url, g.iconographic_tags, g.notes
                FROM graphs g
                JOIN catalog_entries ce ON g.catalog_entry = ce.entry_id
                WHERE ce.legacy_catalog_sign_id = ?
                ORDER BY g.variant_suffix`,
          args: [signId],
        }),
      ]);
      crossRefs = crossRefResult.rows.map(r => ({
        ...r,
        part_of_speech: r.part_of_speech ? JSON.parse(String(r.part_of_speech)) : null,
      }));
      graphs = graphsResult.rows.map(r => ({
        ...r,
        iconographic_tags: r.iconographic_tags ? JSON.parse(String(r.iconographic_tags)) : null,
      }));
    } catch {
      // Tables may not exist yet — gracefully degrade
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      sign: signResult.rows[0],
      graphemes: graphemeResult.rows,
      roboflow: roboflowResult.rows,
      crossRefs,
      graphs,
      prevSign,
      nextSign,
    });
  } catch (err) {
    console.error('Sign detail error:', err);
    return res.status(500).json({ error: 'Failed to load sign', details: String(err) });
  }
}
