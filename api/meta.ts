import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const type = String(req.query.type || '');

  if (type === 'stats') {
    return handleStats(req, res);
  } else if (type === 'sites') {
    return handleSites(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid type. Use ?type=stats or ?type=sites' });
  }
}

async function handleStats(_req: VercelRequest, res: VercelResponse) {
  try {
    // Kerr and CMHI tables may not exist yet — use safe queries
    const safeCount = async (sql: string) => {
      try {
        const r = await db.execute(sql);
        return Number(r.rows[0]?.count ?? 0);
      } catch { return 0; }
    };

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

    const [kerrCount, cmhiDrawings, cmhiPhotos, zenderCount, kettunenCount, gronCount, bonnCount] = await Promise.all([
      safeCount('SELECT COUNT(*) as count FROM kerr_vessels'),
      safeCount("SELECT COUNT(*) as count FROM cmhi_images WHERE image_type = 'drawing'"),
      safeCount("SELECT COUNT(*) as count FROM cmhi_images WHERE image_type = 'photo'"),
      safeCount("SELECT COUNT(*) as count FROM catalog_signs WHERE zender_code IS NOT NULL AND zender_code != ''"),
      safeCount("SELECT COUNT(*) as count FROM catalog_signs WHERE kettunen_code IS NOT NULL AND kettunen_code != ''"),
      safeCount("SELECT COUNT(*) as count FROM catalog_signs WHERE gronemeyer_code IS NOT NULL AND gronemeyer_code != ''"),
      safeCount("SELECT COUNT(*) as count FROM catalog_signs WHERE bonn_image_url IS NOT NULL AND bonn_image_url != ''"),
    ]);

    const signsByRegion: Record<string, number> = {};
    regionResult.rows.forEach((row) => {
      signsByRegion[String(row.region)] = Number(row.count);
    });

    const topSites = sitesResult.rows.map((row) => ({
      site: String(row.site_name),
      count: Number(row.count),
    }));

    // Concordance stats (safe — tables may not exist)
    let concordanceStats: Record<string, unknown> = {};
    try {
      const [entriesByCatalog, totalLinks, totalSlots, totalGraphs, correspondenceTypes, parentStats, slotCertainty, blocksWithGregorian] = await Promise.all([
        db.execute(`SELECT catalog, COUNT(*) as count FROM catalog_entries GROUP BY catalog ORDER BY count DESC`),
        db.execute(`SELECT COUNT(*) as count FROM concordance_links`),
        db.execute(`SELECT COUNT(*) as count FROM block_sign_slots`),
        db.execute(`SELECT COUNT(*) as count FROM graphs`),
        db.execute(`SELECT correspondence, COUNT(*) as count FROM concordance_links GROUP BY correspondence ORDER BY count DESC`),
        db.execute(`
          SELECT
            SUM(CASE WHEN parent_entry IS NOT NULL THEN 1 ELSE 0 END) as variants,
            SUM(CASE WHEN parent_entry IS NULL THEN 1 ELSE 0 END) as parents
          FROM catalog_entries WHERE catalog = 'MHD'
        `),
        db.execute(`SELECT certainty, COUNT(*) as count FROM block_sign_slots GROUP BY certainty ORDER BY count DESC`),
        db.execute(`SELECT COUNT(*) as count FROM blocks WHERE event_gregorian IS NOT NULL AND event_gregorian != ''`),
      ]);
      const entriesPerCatalog: Record<string, number> = {};
      for (const row of entriesByCatalog.rows) {
        entriesPerCatalog[String(row.catalog)] = Number(row.count);
      }
      const correspondenceBreakdown: Record<string, number> = {};
      for (const row of correspondenceTypes.rows) {
        correspondenceBreakdown[String(row.correspondence)] = Number(row.count);
      }
      const slotCertaintyBreakdown: Record<string, number> = {};
      for (const row of slotCertainty.rows) {
        slotCertaintyBreakdown[String(row.certainty)] = Number(row.count);
      }
      concordanceStats = {
        entriesPerCatalog,
        totalConcordanceLinks: Number(totalLinks.rows[0].count),
        totalBlockSignSlots: Number(totalSlots.rows[0].count),
        totalGraphs: Number(totalGraphs.rows[0].count),
        correspondenceBreakdown,
        mhdVariants: Number(parentStats.rows[0].variants),
        mhdParents: Number(parentStats.rows[0].parents),
        slotCertaintyBreakdown,
        blocksWithGregorian: Number(blocksWithGregorian.rows[0].count),
      };
    } catch {
      // Tables don't exist yet
    }

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({
      totalSigns: Number(signsResult.rows[0].count),
      signsWithImages: Number(imagesResult.rows[0].count),
      totalBlocks: Number(blocksResult.rows[0].count),
      totalGraphemes: Number(graphemesResult.rows[0].count),
      totalRoboflow: Number(roboflowResult.rows[0].count),
      totalKerr: kerrCount,
      totalCmhiDrawings: cmhiDrawings,
      totalCmhiPhotos: cmhiPhotos,
      graphemesLinkedToCatalog: Number(linkedResult.rows[0].count),
      blocksWithDates: Number(datesResult.rows[0].count),
      blocksWithTranslations: Number(translationsResult.rows[0].count),
      thompsonCoverage: Number(thompsonResult.rows[0].count),
      zenderCoverage: zenderCount,
      kettunenCoverage: kettunenCount,
      gronemeyerCoverage: gronCount,
      bonnImageCoverage: bonnCount,
      signsByRegion,
      topSites,
      ...concordanceStats,
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to load stats', details: String(err) });
  }
}

async function handleSites(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await db.execute(`
      SELECT
        site_name,
        region,
        COUNT(*) as block_count,
        COUNT(DISTINCT artifact_code) as artifact_count,
        GROUP_CONCAT(DISTINCT artifact_code) as artifact_codes,
        AVG(CASE WHEN latitude IS NOT NULL THEN latitude END) as avg_lat,
        AVG(CASE WHEN longitude IS NOT NULL THEN longitude END) as avg_lng
      FROM blocks
      WHERE site_name IS NOT NULL AND site_name != ''
      GROUP BY site_name, region
      ORDER BY block_count DESC
    `);

    const sites = result.rows.map(row => ({
      name: String(row.site_name),
      region: String(row.region || 'Unknown'),
      blockCount: Number(row.block_count),
      artifactCount: Number(row.artifact_count),
      artifactCodes: String(row.artifact_codes || ''),
      lat: row.avg_lat != null ? Number(row.avg_lat) : null,
      lng: row.avg_lng != null ? Number(row.avg_lng) : null,
    }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ sites });
  } catch (err) {
    console.error('Map sites error:', err);
    return res.status(500).json({ error: 'Failed to load map data', details: String(err) });
  }
}
