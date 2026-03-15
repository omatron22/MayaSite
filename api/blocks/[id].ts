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

    // Fetch sign slots if they exist
    let signSlots: unknown[] = [];
    try {
      const slotsResult = await db.execute({
        sql: `SELECT bss.slot_id, bss.slot_position, bss.certainty, bss.position_in_block, bss.raw_code, bss.graph,
                     ce.entry_id, ce.catalog_code, ce.image_url, ce.reading_value
              FROM block_sign_slots bss
              LEFT JOIN catalog_entries ce ON bss.catalog_entry = ce.entry_id
              WHERE bss.block_id = ?
              ORDER BY bss.slot_position`,
        args: [blockId],
      });
      signSlots = slotsResult.rows;
    } catch {
      // Table may not exist yet
    }

    // Find prev/next blocks by coordinate within same artifact
    const block = blockResult.rows[0] as Record<string, unknown>;
    let prevBlock: { id: number; coordinate: string } | null = null;
    let nextBlock: { id: number; coordinate: string } | null = null;

    if (block.artifact_code && block.coordinate) {
      try {
        const [prevResult, nextResult] = await Promise.all([
          db.execute({
            sql: `SELECT id, coordinate FROM blocks
                  WHERE artifact_code = ? AND coordinate < ? AND coordinate IS NOT NULL AND coordinate != ''
                  ORDER BY coordinate DESC LIMIT 1`,
            args: [block.artifact_code, block.coordinate],
          }),
          db.execute({
            sql: `SELECT id, coordinate FROM blocks
                  WHERE artifact_code = ? AND coordinate > ? AND coordinate IS NOT NULL AND coordinate != ''
                  ORDER BY coordinate ASC LIMIT 1`,
            args: [block.artifact_code, block.coordinate],
          }),
        ]);
        if (prevResult.rows.length > 0) prevBlock = { id: Number(prevResult.rows[0].id), coordinate: String(prevResult.rows[0].coordinate) };
        if (nextResult.rows.length > 0) nextBlock = { id: Number(nextResult.rows[0].id), coordinate: String(nextResult.rows[0].coordinate) };
      } catch {
        // Non-critical — skip nav
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      block: blockResult.rows[0],
      graphemes: graphemesResult.rows,
      signSlots,
      prevBlock,
      nextBlock,
    });
  } catch (err) {
    console.error('Block detail error:', err);
    return res.status(500).json({ error: 'Failed to load block', details: String(err) });
  }
}
