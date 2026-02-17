import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db.js';
import type { AnalyticsDataSource, AnalyticsInstance } from './lib/types.js';

const TIME_PERIODS = [
  { name: 'Early Preclassic', start: -2000, end: -1000 },
  { name: 'Middle Preclassic', start: -1000, end: -400 },
  { name: 'Late Preclassic', start: -400, end: 100 },
  { name: 'Terminal Preclassic', start: 100, end: 250 },
  { name: 'Early Classic', start: 250, end: 550 },
  { name: 'Late Classic', start: 550, end: 830 },
  { name: 'Terminal Classic', start: 830, end: 950 },
  { name: 'Early Postclassic', start: 950, end: 1200 },
  { name: 'Late Postclassic', start: 1200, end: 1540 },
  { name: 'Invalid/Undated', start: 0, end: 0 },
] as const;

function parseLongCount(longCount: string): number | null {
  if (!longCount || longCount === '-') return null;

  const cleaned = longCount.replace(/^-/, '').replace(/\?/g, '');
  const match = cleaned.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  const [, baktun, katun, tun, uinal, kin] = match.map(Number);
  const totalDays = (baktun * 144000) + (katun * 7200) + (tun * 360) + (uinal * 20) + kin;
  const ceYear = Math.round(-3114 + (totalDays / 365.25));

  return (ceYear < -3000 || ceYear > 2000) ? null : ceYear;
}

function getTimePeriod(year: number | null): string {
  if (year === null) return 'Invalid/Undated';

  for (const period of TIME_PERIODS) {
    if (period.name === 'Invalid/Undated') continue;
    if (year >= period.start && year < period.end) return period.name;
  }
  return 'Invalid/Undated';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      source = 'mhd',
      period = 'all',
      region = 'all',
    } = req.query as Record<string, string>;

    const dataSource = source as AnalyticsDataSource;
    const allInstances: AnalyticsInstance[] = [];

    // Load MHD data
    if (dataSource === 'mhd' || dataSource === 'both') {
      const mhdResult = await db.execute(`
        SELECT
          g.id,
          cs.graphcode,
          cs.syllabic_value,
          cs.primary_image_url,
          b.event_long_count,
          b.region,
          b.site_name,
          b.artifact_code
        FROM graphemes g
        INNER JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
        INNER JOIN blocks b ON g.block_id = b.id
        WHERE b.event_long_count IS NOT NULL
          AND b.event_long_count != '-'
          AND cs.graphcode IS NOT NULL
          AND cs.primary_image_url IS NOT NULL
      `);

      for (const row of mhdResult.rows) {
        const year = parseLongCount(String(row.event_long_count));
        const instancePeriod = getTimePeriod(year);
        const instanceRegion = String(row.region || 'Unknown');

        // Apply filters server-side
        if (period !== 'all' && instancePeriod !== period) continue;
        if (region !== 'all' && instanceRegion !== region) continue;

        allInstances.push({
          id: `mhd-${row.id}`,
          sign: String(row.graphcode || 'Unknown'),
          syllabic: String(row.syllabic_value || ''),
          imageUrl: String(row.primary_image_url),
          longCount: String(row.event_long_count),
          year,
          region: instanceRegion,
          site: String(row.site_name || row.artifact_code || 'Unknown'),
          period: instancePeriod,
          source: 'mhd',
        });
      }
    }

    // Load Roboflow data
    if (dataSource === 'roboflow' || dataSource === 'both') {
      const roboflowResult = await db.execute(`
        SELECT
          r.id,
          r.image_url,
          r.confidence,
          r.dataset_split,
          cs.graphcode,
          cs.syllabic_value
        FROM roboflow_instances r
        INNER JOIN catalog_signs cs ON r.catalog_sign_id = cs.id
        WHERE cs.graphcode IS NOT NULL
      `);

      for (const row of roboflowResult.rows) {
        if (period !== 'all' && period !== 'Roboflow Dataset') continue;
        if (region !== 'all' && region !== 'Roboflow') continue;

        allInstances.push({
          id: `roboflow-${row.id}`,
          sign: String(row.graphcode || 'Unknown'),
          syllabic: String(row.syllabic_value || ''),
          imageUrl: String(row.image_url),
          longCount: 'N/A',
          year: null,
          region: 'Roboflow',
          site: `Annotated (${row.dataset_split || 'unknown'})`,
          period: 'Roboflow Dataset',
          source: 'roboflow',
        });
      }
    }

    allInstances.sort((a, b) => {
      if (a.year === null && b.year === null) return 0;
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return a.year - b.year;
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      data: allInstances,
      total: allInstances.length,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to load analytics', details: String(err) });
  }
}
