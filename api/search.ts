import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db';
import type { SearchParams, SearchResponse, SignSearchResult, BlockSearchResult, GraphemeSearchResult } from './lib/types';

const VALID_SORT_COLUMNS = ['mhd_code', 'graphcode', 'thompson_code', 'zender_code', 'kettunen_code', 'gronemeyer_code', 'syllabic_value', 'english_translation', 'bonn_sign_number'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      mode = 'signs',
      q = '',
      page = '1',
      pageSize = '48',
      volume,
      wordClass,
      technique,
      distribution,
      hasImage,
      hasRoboflow,
      hasInstances,
      hasTranslation,
      sortBy = 'code',
      region,
      artifact,
      site,
      hasDate,
      export: exportMode,
    } = req.query as Record<string, string>;

    if (mode === 'concordance') {
      return handleConcordance(req, res);
    }

    const isExport = exportMode === 'true';
    const pageNum = isExport ? 1 : Math.max(1, parseInt(page));
    const pageSizeNum = isExport ? 10000 : Math.min(100, Math.max(1, parseInt(pageSize)));
    const offset = (pageNum - 1) * pageSizeNum;
    const query = (q || '').trim();

    let response: SearchResponse;

    if (mode === 'signs') {
      response = await searchSigns(query, {
        volume, wordClass, technique, distribution,
        hasImage: hasImage === 'true',
        hasRoboflow: hasRoboflow === 'true',
        hasInstances: hasInstances === 'true',
        hasTranslation: hasTranslation === 'true',
        sortBy: sortBy as 'code' | 'frequency' | 'completeness',
      }, pageSizeNum, offset, pageNum);
    } else if (mode === 'blocks') {
      response = await searchBlocks(query, {
        region, artifact, site,
        hasDate: hasDate === 'true',
      }, pageSizeNum, offset, pageNum);
    } else {
      response = await searchGraphemes(query, {
        region, artifact, site,
        hasImage: hasImage === 'true',
        hasDate: hasDate === 'true',
      }, pageSizeNum, offset, pageNum);
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(response);
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed', details: String(err) });
  }
}

interface SignFilters {
  volume?: string;
  wordClass?: string;
  technique?: string;
  distribution?: string;
  hasImage: boolean;
  hasRoboflow: boolean;
  hasInstances: boolean;
  hasTranslation: boolean;
  sortBy: 'code' | 'frequency' | 'completeness';
}

async function searchSigns(
  query: string,
  filters: SignFilters,
  pageSize: number,
  offset: number,
  page: number
): Promise<SearchResponse> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query) {
    conditions.push(`(
      graphcode LIKE ? OR
      mhd_code LIKE ? OR
      thompson_code LIKE ? OR
      syllabic_value LIKE ? OR
      english_translation LIKE ? OR
      logographic_value LIKE ? OR
      CAST(bonn_sign_number AS TEXT) LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam, qParam, qParam, qParam);
  }

  if (filters.volume && filters.volume !== 'all') {
    conditions.push('volume = ?');
    params.push(filters.volume);
  }
  if (filters.wordClass && filters.wordClass !== 'all') {
    conditions.push('word_class LIKE ?');
    params.push(`%${filters.wordClass}%`);
  }
  if (filters.technique && filters.technique !== 'all') {
    conditions.push('technique = ?');
    params.push(filters.technique);
  }
  if (filters.distribution && filters.distribution !== 'all') {
    conditions.push('distribution = ?');
    params.push(filters.distribution);
  }
  if (filters.hasImage) {
    conditions.push("primary_image_url IS NOT NULL AND primary_image_url != ''");
  }
  if (filters.hasRoboflow) {
    conditions.push('EXISTS (SELECT 1 FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id)');
  }
  if (filters.hasInstances) {
    conditions.push('EXISTS (SELECT 1 FROM graphemes g WHERE g.catalog_sign_id = cs.id)');
  }
  if (filters.hasTranslation) {
    conditions.push("english_translation IS NOT NULL AND english_translation != ''");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM catalog_signs cs ${whereClause}`,
    args: params,
  });
  const total = Number(countResult.rows[0].count);

  const sortClause = getSortClause(filters.sortBy);
  const signsResult = await db.execute({
    sql: `
      SELECT
        cs.*,
        COALESCE(cs.mhd_code_sub, cs.graphcode, cs.mhd_code) as display_code,
        (SELECT COUNT(*) FROM graphemes g WHERE g.catalog_sign_id = cs.id) as grapheme_count,
        (SELECT COUNT(*) FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id) as roboflow_count
      FROM catalog_signs cs
      ${whereClause}
      ${sortClause}
      LIMIT ? OFFSET ?
    `,
    args: [...params, pageSize, offset],
  });

  return { results: signsResult.rows as unknown as SignSearchResult[], total, page, pageSize };
}

interface BlockFilters {
  region?: string;
  artifact?: string;
  site?: string;
  hasDate: boolean;
}

async function searchBlocks(
  query: string,
  filters: BlockFilters,
  pageSize: number,
  offset: number,
  page: number
): Promise<SearchResponse> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query) {
    conditions.push(`(
      mhd_block_id LIKE ? OR
      artifact_code LIKE ? OR
      block_english LIKE ? OR
      block_maya1 LIKE ? OR
      event_calendar LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam, qParam);
  }

  if (filters.region && filters.region !== 'all') {
    conditions.push('region = ?');
    params.push(filters.region);
  }
  if (filters.artifact && filters.artifact.trim()) {
    conditions.push('artifact_code LIKE ?');
    params.push(`%${filters.artifact}%`);
  }
  if (filters.site && filters.site.trim()) {
    conditions.push('site_name LIKE ?');
    params.push(`%${filters.site}%`);
  }
  if (filters.hasDate) {
    conditions.push("event_calendar IS NOT NULL AND event_calendar != ''");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM blocks ${whereClause}`,
    args: params,
  });
  const total = Number(countResult.rows[0].count);

  const blocksResult = await db.execute({
    sql: `
      SELECT
        id,
        mhd_block_id as block_id,
        artifact_code,
        block_maya1,
        block_english,
        event_calendar,
        COALESCE(block_image1_url, block_image2_url) as block_img,
        region,
        site_name
      FROM blocks
      ${whereClause}
      ORDER BY sort_order
      LIMIT ? OFFSET ?
    `,
    args: [...params, pageSize, offset],
  });

  return { results: blocksResult.rows as unknown as BlockSearchResult[], total, page, pageSize };
}

interface GraphemeFilters {
  region?: string;
  artifact?: string;
  site?: string;
  hasImage: boolean;
  hasDate: boolean;
}

async function searchGraphemes(
  query: string,
  filters: GraphemeFilters,
  pageSize: number,
  offset: number,
  page: number
): Promise<SearchResponse> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query) {
    conditions.push(`(
      g.grapheme_code LIKE ? OR
      g.artifact_code LIKE ? OR
      b.block_english LIKE ? OR
      b.block_maya1 LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam);
  }

  if (filters.region && filters.region !== 'all') {
    conditions.push('b.region = ?');
    params.push(filters.region);
  }
  if (filters.artifact && filters.artifact.trim()) {
    conditions.push('g.artifact_code LIKE ?');
    params.push(`%${filters.artifact}%`);
  }
  if (filters.site && filters.site.trim()) {
    conditions.push('b.site_name LIKE ?');
    params.push(`%${filters.site}%`);
  }
  if (filters.hasImage) {
    conditions.push("cs.primary_image_url IS NOT NULL AND cs.primary_image_url != ''");
  }
  if (filters.hasDate) {
    conditions.push("b.event_calendar IS NOT NULL AND b.event_calendar != ''");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM graphemes g
      LEFT JOIN blocks b ON g.block_id = b.id
      LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
      ${whereClause}
    `,
    args: params,
  });
  const total = Number(countResult.rows[0].count);

  const graphemesResult = await db.execute({
    sql: `
      SELECT
        g.*,
        b.block_maya1,
        b.block_english,
        b.event_calendar,
        COALESCE(b.block_image1_url, b.block_image2_url) as block_img,
        b.region,
        b.site_name,
        cs.mhd_code_sub,
        cs.syllabic_value,
        cs.primary_image_url
      FROM graphemes g
      LEFT JOIN blocks b ON g.block_id = b.id
      LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
      ${whereClause}
      ORDER BY g.id
      LIMIT ? OFFSET ?
    `,
    args: [...params, pageSize, offset],
  });

  return { results: graphemesResult.rows as unknown as GraphemeSearchResult[], total, page, pageSize };
}

function getSortClause(sortBy: 'code' | 'frequency' | 'completeness'): string {
  switch (sortBy) {
    case 'frequency':
      return 'ORDER BY grapheme_count DESC, cs.id';
    case 'completeness':
      return `ORDER BY (
        CASE WHEN primary_image_url IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN english_translation IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN syllabic_value IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN thompson_code IS NOT NULL THEN 1 ELSE 0 END
      ) DESC, cs.id`;
    default:
      return 'ORDER BY cs.graphcode, cs.id';
  }
}

async function handleConcordance(req: VercelRequest, res: VercelResponse) {
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
