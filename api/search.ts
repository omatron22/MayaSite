import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/db.js';
import type { SearchResponse, SignSearchResult, BlockSearchResult, GraphemeSearchResult } from './lib/types.js';


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
      collapseVariants,
      source,
      readingType,
    } = req.query as Record<string, string>;

    if (mode === 'concordance') {
      return handleNewConcordance(req, res);
    }

    if (mode === 'entry_detail') {
      return handleEntryDetail(req, res);
    }

    if (mode === 'entities') {
      return handleEntitySearch(req, res);
    }

    const isExport = exportMode === 'true';
    const pageNum = isExport ? 1 : Math.max(1, parseInt(page));
    const pageSizeNum = isExport ? 5000 : Math.min(100, Math.max(1, parseInt(pageSize)));
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
        collapseVariants: collapseVariants === 'true',
        source, readingType,
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
  collapseVariants: boolean;
  source?: string;
  readingType?: string;
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

  // Always filter out "shell" entries — catalog_signs rows with no
  // graphcode and no readings/translation. These are upstream MHD code
  // placeholders with no actual sign data; ~19% of the table. Surfacing
  // them in search confuses users.
  conditions.push(`(graphcode IS NOT NULL AND graphcode != '')`);

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
    const vals = filters.volume.split(',').filter(Boolean);
    if (vals.length === 1) { conditions.push('volume = ?'); params.push(vals[0]); }
    else if (vals.length > 1) { conditions.push(`volume IN (${vals.map(() => '?').join(',')})`); params.push(...vals); }
  }
  if (filters.wordClass && filters.wordClass !== 'all') {
    const vals = filters.wordClass.split(',').filter(Boolean);
    if (vals.length === 1) { conditions.push('word_class LIKE ?'); params.push(`%${vals[0]}%`); }
    else if (vals.length > 1) { conditions.push(`(${vals.map(() => 'word_class LIKE ?').join(' OR ')})`); params.push(...vals.map(v => `%${v}%`)); }
  }
  if (filters.technique && filters.technique !== 'all') {
    const vals = filters.technique.split(',').filter(Boolean).map(v => v.toLowerCase());
    if (vals.length === 1) { conditions.push('LOWER(technique) = ?'); params.push(vals[0]); }
    else if (vals.length > 1) { conditions.push(`LOWER(technique) IN (${vals.map(() => '?').join(',')})`); params.push(...vals); }
  }
  if (filters.distribution && filters.distribution !== 'all') {
    const vals = filters.distribution.split(',').filter(Boolean).map(v => v.toLowerCase());
    // Include 'both' when filtering by monuments or codices (signs with distribution='both' belong to both)
    const expanded = new Set(vals);
    if (expanded.has('monuments') || expanded.has('codices')) expanded.add('both');
    const allVals = Array.from(expanded);
    if (allVals.length === 1) { conditions.push('LOWER(distribution) = ?'); params.push(allVals[0]); }
    else { conditions.push(`LOWER(distribution) IN (${allVals.map(() => '?').join(',')})`); params.push(...allVals); }
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

  // Filter by sign_readings source and/or reading_type. When BOTH are present
  // we must enforce them on the SAME reading row (single EXISTS), otherwise a
  // sign with a TWKM phonogram + an MHD logogram would falsely match
  // source=twkm AND readingType=logogram.
  const sources = (filters.source && filters.source !== 'all') ? filters.source.split(',').filter(Boolean) : [];
  const types = (filters.readingType && filters.readingType !== 'all') ? filters.readingType.split(',').filter(Boolean) : [];

  if (sources.length > 0 || types.length > 0) {
    const subConds: string[] = ['sr.catalog_sign_id = cs.id'];
    if (sources.length === 1) { subConds.push('sr.source_collection_id = ?'); params.push(sources[0]); }
    else if (sources.length > 1) { subConds.push(`sr.source_collection_id IN (${sources.map(() => '?').join(',')})`); params.push(...sources); }
    if (types.length === 1) { subConds.push('sr.reading_type = ?'); params.push(types[0]); }
    else if (types.length > 1) { subConds.push(`sr.reading_type IN (${types.map(() => '?').join(',')})`); params.push(...types); }
    conditions.push(`EXISTS (SELECT 1 FROM sign_readings sr WHERE ${subConds.join(' AND ')})`);
  }

  // Variant collapse: only show parent entries and include variant counts
  if (filters.collapseVariants) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM catalog_entries ce
      WHERE ce.legacy_catalog_sign_id = cs.id
        AND ce.catalog = 'MHD'
        AND ce.parent_entry IS NOT NULL
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM catalog_signs cs ${whereClause}`,
    args: params,
  });
  const total = Number(countResult.rows[0].count);

  const sortClause = getSortClause(filters.sortBy);
  const variantCountCol = filters.collapseVariants
    ? `, (SELECT COUNT(*) FROM catalog_entries ce2
        WHERE ce2.parent_entry = (SELECT entry_id FROM catalog_entries ce3 WHERE ce3.legacy_catalog_sign_id = cs.id AND ce3.catalog = 'MHD' LIMIT 1)
       ) as variant_count`
    : '';
  const signsResult = await db.execute({
    sql: `
      SELECT
        cs.*,
        COALESCE(cs.mhd_code_sub, cs.graphcode, cs.mhd_code) as display_code,
        (SELECT COUNT(*) FROM graphemes g WHERE g.catalog_sign_id = cs.id) as grapheme_count,
        (SELECT COUNT(*) FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id) as roboflow_count
        ${variantCountCol}
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
      transcription_1 LIKE ? OR
      event_calendar LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam, qParam);
  }

  if (filters.region && filters.region !== 'all') {
    const regions = filters.region.split(',').filter(Boolean);
    if (regions.length === 1) {
      conditions.push('region = ?');
      params.push(regions[0]);
    } else if (regions.length > 1) {
      conditions.push(`region IN (${regions.map(() => '?').join(',')})`);
      params.push(...regions);
    }
  }
  if (filters.artifact && filters.artifact.trim()) {
    conditions.push('artifact_code LIKE ?');
    params.push(`%${filters.artifact}%`);
  }
  if (filters.site && filters.site.trim()) {
    const sites = filters.site.split(',').filter(Boolean);
    if (sites.length === 1) {
      conditions.push('site_name LIKE ?');
      params.push(`%${sites[0]}%`);
    } else if (sites.length > 1) {
      conditions.push(`(${sites.map(() => 'site_name LIKE ?').join(' OR ')})`);
      params.push(...sites.map(s => `%${s}%`));
    }
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
        *,
        mhd_block_id as block_id,
        COALESCE(block_image1_url, block_image2_url) as block_img
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
      b.transcription_1 LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam);
  }

  if (filters.region && filters.region !== 'all') {
    const regions = filters.region.split(',').filter(Boolean);
    if (regions.length === 1) {
      conditions.push('b.region = ?');
      params.push(regions[0]);
    } else if (regions.length > 1) {
      conditions.push(`b.region IN (${regions.map(() => '?').join(',')})`);
      params.push(...regions);
    }
  }
  if (filters.artifact && filters.artifact.trim()) {
    conditions.push('g.artifact_code LIKE ?');
    params.push(`%${filters.artifact}%`);
  }
  if (filters.site && filters.site.trim()) {
    const sites = filters.site.split(',').filter(Boolean);
    if (sites.length === 1) {
      conditions.push('b.site_name LIKE ?');
      params.push(`%${sites[0]}%`);
    } else if (sites.length > 1) {
      conditions.push(`(${sites.map(() => 'b.site_name LIKE ?').join(' OR ')})`);
      params.push(...sites.map(s => `%${s}%`));
    }
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
        b.transcription_1,
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

const NEW_CONCORDANCE_SORT_COLS = ['catalog_code', 'catalog', 'reading_value', 'gloss_english', 'entry_id'];

async function handleNewConcordance(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
  const catalogFilter = String(req.query.catalog || '').trim();
  const sortBy = NEW_CONCORDANCE_SORT_COLS.includes(String(req.query.sortBy)) ? String(req.query.sortBy) : 'catalog_code';
  const sortDir = String(req.query.sortDir) === 'desc' ? 'DESC' : 'ASC';
  const collapseVariants = String(req.query.collapseVariants || 'true') !== 'false';
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (q) {
    conditions.push(`(ce.catalog_code LIKE ? OR ce.reading_value LIKE ? OR ce.gloss_english LIKE ? OR ce.entry_id LIKE ?)`);
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }

  if (catalogFilter) {
    const catalogs = catalogFilter.split(',').filter(Boolean);
    if (catalogs.length === 1) {
      conditions.push('ce.catalog = ?');
      args.push(catalogs[0]);
    } else if (catalogs.length > 1) {
      conditions.push(`ce.catalog IN (${catalogs.map(() => '?').join(',')})`);
      args.push(...catalogs);
    }
  }

  // Default: collapse variants to show parent entries only
  if (collapseVariants) {
    conditions.push('ce.parent_entry IS NULL');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const variantCountSelect = collapseVariants
    ? `, (SELECT COUNT(*) FROM catalog_entries cv WHERE cv.parent_entry = ce.entry_id) as variant_count`
    : '';

  const attestationCountSelect = `, (SELECT COUNT(*) FROM graphemes g WHERE g.grapheme_code = ce.catalog_code AND ce.catalog = 'MHD') as attestation_count`;

  try {
    const [dataResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT ce.entry_id, ce.catalog, ce.catalog_code, ce.reading_value,
                     ce.reading_type, ce.gloss_english, ce.image_url, ce.confidence_level
                     ${variantCountSelect}
                     ${attestationCountSelect}
              FROM catalog_entries ce
              ${where}
              ORDER BY ce.${sortBy} ${sortDir}
              LIMIT ? OFFSET ?`,
        args: [...args, pageSize, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM catalog_entries ce ${where}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].total);

    // Fetch cross-references for the returned entries
    const entryIds = dataResult.rows.map(r => String(r.entry_id));
    const crossRefs: Record<string, { entry_id: string; catalog: string; catalog_code: string; correspondence: string }[]> = {};

    if (entryIds.length > 0) {
      const placeholders = entryIds.map(() => '?').join(',');
      const linksResult = await db.execute({
        sql: `SELECT cl.entry_a, cl.entry_b, cl.correspondence,
                     ce2.entry_id as ref_entry_id, ce2.catalog as ref_catalog, ce2.catalog_code as ref_code
              FROM concordance_links cl
              JOIN catalog_entries ce2 ON (
                CASE WHEN cl.entry_a IN (${placeholders}) THEN cl.entry_b ELSE cl.entry_a END = ce2.entry_id
              )
              WHERE cl.entry_a IN (${placeholders}) OR cl.entry_b IN (${placeholders})`,
        args: [...entryIds, ...entryIds, ...entryIds],
      });

      for (const link of linksResult.rows) {
        const entryA = String(link.entry_a);
        const entryB = String(link.entry_b);
        const sourceId = entryIds.includes(entryA) ? entryA : entryB;
        const ref = {
          entry_id: String(link.ref_entry_id),
          catalog: String(link.ref_catalog),
          catalog_code: String(link.ref_code),
          correspondence: String(link.correspondence),
        };
        if (!crossRefs[sourceId]) crossRefs[sourceId] = [];
        crossRefs[sourceId].push(ref);
      }
    }

    const rows = dataResult.rows.map(r => ({
      entry_id: r.entry_id,
      catalog: r.catalog,
      catalog_code: r.catalog_code,
      reading_value: r.reading_value,
      reading_type: r.reading_type,
      gloss_english: r.gloss_english,
      image_url: r.image_url,
      confidence_level: r.confidence_level,
      variant_count: r.variant_count != null ? Number(r.variant_count) : undefined,
      attestation_count: r.attestation_count != null ? Number(r.attestation_count) : 0,
      cross_references: crossRefs[String(r.entry_id)] || [],
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ rows, total, page, pageSize });
  } catch (err) {
    console.error('New concordance error:', err);
    return res.status(500).json({ error: 'Failed to load concordance data', details: String(err) });
  }
}

async function handleEntitySearch(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q || '').trim().toLowerCase();
  const typeFilter = String(req.query.entityType || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (q) {
    conditions.push(`(e.normalized_name LIKE ?
      OR EXISTS (SELECT 1 FROM entity_aliases a WHERE a.entity_id = e.entity_id AND a.normalized_alias LIKE ?))`);
    const like = `%${q}%`;
    args.push(like, like);
  }
  if (typeFilter && typeFilter !== 'all') {
    const types = typeFilter.split(',').filter(Boolean);
    if (types.length === 1) { conditions.push('e.entity_type = ?'); args.push(types[0]); }
    else if (types.length > 1) {
      conditions.push(`e.entity_type IN (${types.map(() => '?').join(',')})`);
      args.push(...types);
    }
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [countRes, rowsRes] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) AS n FROM entities e ${where}`,
        args,
      }),
      db.execute({
        sql: `SELECT e.entity_id, e.entity_type, e.canonical_name, e.description,
                     (SELECT COUNT(DISTINCT m.block_id) FROM entity_mentions m WHERE m.entity_id = e.entity_id) AS block_count,
                     (SELECT GROUP_CONCAT(a.alias, ' | ') FROM entity_aliases a WHERE a.entity_id = e.entity_id) AS aliases
              FROM entities e
              ${where}
              ORDER BY block_count DESC, e.canonical_name
              LIMIT ? OFFSET ?`,
        args: [...args, pageSize, offset],
      }),
    ]);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      results: rowsRes.rows,
      total: Number(countRes.rows[0].n),
      page,
      pageSize,
    });
  } catch (err) {
    console.error('Entity search error:', err);
    return res.status(500).json({ error: 'Entity search failed', details: String(err) });
  }
}

async function handleEntryDetail(req: VercelRequest, res: VercelResponse) {
  const entryId = String(req.query.entryId || '').trim();
  if (!entryId) {
    return res.status(400).json({ error: 'entryId is required' });
  }

  try {
    // Fetch the entry itself
    const entryResult = await db.execute({
      sql: `SELECT * FROM catalog_entries WHERE entry_id = ?`,
      args: [entryId],
    });

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const entry = entryResult.rows[0];

    // Fetch cross-references, graphs, and attestations in parallel
    const [crossRefResult, graphsResult, graphemesResult] = await Promise.all([
      db.execute({
        sql: `SELECT ce2.entry_id, ce2.catalog, ce2.catalog_code,
                     ce2.reading_value, ce2.gloss_english, ce2.confidence_level,
                     ce2.image_url as entry_image_url,
                     cl.correspondence, cl.asserted_by
              FROM concordance_links cl
              JOIN catalog_entries ce2 ON ce2.entry_id = CASE
                WHEN cl.entry_a = ? THEN cl.entry_b ELSE cl.entry_a END
              WHERE cl.entry_a = ? OR cl.entry_b = ?
              ORDER BY ce2.catalog, ce2.catalog_code`,
        args: [entryId, entryId, entryId],
      }),
      db.execute({
        sql: `SELECT graph_id, variant_suffix, variant_type_label, image_url, iconographic_tags, notes, medium
              FROM graphs
              WHERE catalog_entry = ?
              ORDER BY variant_suffix`,
        args: [entryId],
      }),
      // Fetch attestations (grapheme instances) via legacy_catalog_sign_id
      entry.legacy_catalog_sign_id
        ? db.execute({
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
            args: [entry.legacy_catalog_sign_id],
          })
        : Promise.resolve({ rows: [] }),
    ]);

    const crossRefs = crossRefResult.rows.map(r => ({
      entry_id: r.entry_id,
      catalog: r.catalog,
      catalog_code: r.catalog_code,
      reading_value: r.reading_value,
      gloss_english: r.gloss_english,
      confidence_level: r.confidence_level,
      entry_image_url: r.entry_image_url,
      correspondence: r.correspondence,
      asserted_by: r.asserted_by,
    }));

    const graphs = graphsResult.rows.map(r => ({
      graph_id: r.graph_id,
      variant_suffix: r.variant_suffix,
      variant_type_label: r.variant_type_label,
      image_url: r.image_url,
      iconographic_tags: r.iconographic_tags ? JSON.parse(String(r.iconographic_tags)) : null,
      notes: r.notes,
      medium: r.medium,
    }));

    const graphemes = graphemesResult.rows;

    // Find prev/next entry within same catalog
    let prevEntry: { entry_id: string; code: string } | null = null;
    let nextEntry: { entry_id: string; code: string } | null = null;
    try {
      const catalog = String(entry.catalog);
      const code = String(entry.catalog_code);
      const [prevResult, nextResult] = await Promise.all([
        db.execute({ sql: 'SELECT entry_id, catalog_code as code FROM catalog_entries WHERE catalog = ? AND catalog_code < ? ORDER BY catalog_code DESC LIMIT 1', args: [catalog, code] }),
        db.execute({ sql: 'SELECT entry_id, catalog_code as code FROM catalog_entries WHERE catalog = ? AND catalog_code > ? ORDER BY catalog_code ASC LIMIT 1', args: [catalog, code] }),
      ]);
      if (prevResult.rows.length > 0) prevEntry = { entry_id: String(prevResult.rows[0].entry_id), code: String(prevResult.rows[0].code) };
      if (nextResult.rows.length > 0) nextEntry = { entry_id: String(nextResult.rows[0].entry_id), code: String(nextResult.rows[0].code) };
    } catch { /* non-critical */ }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      entry: {
        ...entry,
        part_of_speech: entry.part_of_speech ? JSON.parse(String(entry.part_of_speech)) : null,
      },
      crossRefs,
      graphs,
      graphemes,
      prevEntry,
      nextEntry,
    });
  } catch (err) {
    console.error('Entry detail error:', err);
    return res.status(500).json({ error: 'Failed to load entry', details: String(err) });
  }
}
