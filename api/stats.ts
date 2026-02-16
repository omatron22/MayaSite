import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [
      signsResult,
      imagesResult,
      blocksResult,
      graphemesResult,
      roboflowResult,
      linkedResult,
      datesResult,
      translationsResult,
      thompsonResult,
      regionResult,
      sitesResult,
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM catalog_signs'),
      db.execute(`
        SELECT COUNT(*) as count FROM catalog_signs
        WHERE primary_image_url IS NOT NULL AND primary_image_url != ''
      `),
      db.execute('SELECT COUNT(*) as count FROM blocks'),
      db.execute('SELECT COUNT(*) as count FROM graphemes'),
      db.execute('SELECT COUNT(*) as count FROM roboflow_instances'),
      db.execute(`
        SELECT COUNT(*) as count FROM graphemes
        WHERE catalog_sign_id IS NOT NULL
      `),
      db.execute(`
        SELECT COUNT(*) as count FROM blocks
        WHERE event_calendar IS NOT NULL
          AND event_calendar != ''
          AND event_calendar != '-'
      `),
      db.execute(`
        SELECT COUNT(*) as count FROM blocks
        WHERE block_english IS NOT NULL
          AND block_english != ''
          AND block_english != '_'
      `),
      db.execute(`
        SELECT COUNT(*) as count FROM catalog_signs
        WHERE thompson_code IS NOT NULL AND thompson_code != ''
      `),
      db.execute(`
        SELECT b.region, COUNT(*) as count
        FROM graphemes g
        INNER JOIN blocks b ON g.block_id = b.id
        WHERE b.region IS NOT NULL AND b.region != ''
        GROUP BY b.region
        ORDER BY count DESC
      `),
      db.execute(`
        SELECT b.site_name, COUNT(*) as count
        FROM graphemes g
        INNER JOIN blocks b ON g.block_id = b.id
        WHERE b.site_name IS NOT NULL AND b.site_name != ''
        GROUP BY b.site_name
        ORDER BY count DESC
        LIMIT 15
      `),
    ]);

    const signsByRegion: Record<string, number> = {};
    regionResult.rows.forEach((row) => {
      signsByRegion[String(row.region)] = Number(row.count);
    });

    const topSites = sitesResult.rows.map((row) => ({
      site: String(row.site_name),
      count: Number(row.count),
    }));

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({
      totalSigns: Number(signsResult.rows[0].count),
      signsWithImages: Number(imagesResult.rows[0].count),
      totalBlocks: Number(blocksResult.rows[0].count),
      totalGraphemes: Number(graphemesResult.rows[0].count),
      totalRoboflow: Number(roboflowResult.rows[0].count),
      graphemesLinkedToCatalog: Number(linkedResult.rows[0].count),
      blocksWithDates: Number(datesResult.rows[0].count),
      blocksWithTranslations: Number(translationsResult.rows[0].count),
      thompsonCoverage: Number(thompsonResult.rows[0].count),
      signsByRegion,
      topSites,
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to load stats', details: String(err) });
  }
}
