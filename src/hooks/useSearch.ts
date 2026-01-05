// src/hooks/useSearch.ts
import { useState, useCallback } from 'react';
import { db } from '../lib/db';
import type { SearchFilters } from './useSearchFilters';

type ViewMode = 'signs' | 'blocks' | 'graphemes';

export function useSearch(viewMode: ViewMode, filters: SearchFilters, query: string, page: number, pageSize: number) {
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const search = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      
      if (viewMode === 'signs') {
        await searchSigns(query, filters, pageSize, offset, setResults, setTotalResults);
      } else if (viewMode === 'blocks') {
        await searchBlocks(query, filters, pageSize, offset, setResults, setTotalResults);
      } else {
        await searchGraphemes(query, filters, pageSize, offset, setResults, setTotalResults);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, query, filters, page, pageSize]);
  
  return { results, totalResults, loading, search };
}

// Helper functions
async function searchSigns(
  query: string,
  filters: SearchFilters,
  pageSize: number,
  offset: number,
  setResults: (results: any[]) => void,
  setTotalResults: (total: number) => void
) {
  const { whereClause, params } = buildSignsWhere(query, filters);
  
  // Get count
  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM catalog_signs cs ${whereClause}`,
    args: params
  });
  setTotalResults(Number(countResult.rows[0].count));
  
  // Get results with sort
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
    args: [...params, pageSize, offset]
  });
  
  setResults(signsResult.rows);
}

async function searchBlocks(
  query: string,
  filters: SearchFilters,
  pageSize: number,
  offset: number,
  setResults: (results: any[]) => void,
  setTotalResults: (total: number) => void
) {
  const { whereClause, params } = buildBlocksWhere(query, filters);
  
  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM blocks ${whereClause}`,
    args: params
  });
  setTotalResults(Number(countResult.rows[0].count));
  
  const blocksResult = await db.execute({
    sql: `
      SELECT 
        id,
        mhd_block_id as block_id,
        artifact_code,
        block_maya1,
        block_english,
        event_calendar,
        block_image1_url as block_img,
        region,
        site_name
      FROM blocks
      ${whereClause}
      ORDER BY sort_order
      LIMIT ? OFFSET ?
    `,
    args: [...params, pageSize, offset]
  });
  
  setResults(blocksResult.rows);
}

async function searchGraphemes(
  query: string,
  filters: SearchFilters,
  pageSize: number,
  offset: number,
  setResults: (results: any[]) => void,
  setTotalResults: (total: number) => void
) {
  const { whereClause, params } = buildGraphemesWhere(query, filters);
  
  const countResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count 
      FROM graphemes g
      LEFT JOIN blocks b ON g.block_id = b.id
      LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
      ${whereClause}
    `,
    args: params
  });
  setTotalResults(Number(countResult.rows[0].count));
  
  const graphemesResult = await db.execute({
    sql: `
      SELECT 
        g.*,
        b.block_maya1,
        b.block_english,
        b.event_calendar,
        b.block_image1_url as block_img,
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
    args: [...params, pageSize, offset]
  });
  
  setResults(graphemesResult.rows);
}

// WHERE clause builders
function buildSignsWhere(query: string, filters: SearchFilters) {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (query.trim()) {
    conditions.push(`(
      graphcode LIKE ? OR 
      mhd_code LIKE ? OR 
      thompson_code LIKE ? OR 
      syllabic_value LIKE ? OR 
      english_translation LIKE ? OR
      logographic_value LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam, qParam, qParam);
  }
  
  if (filters.volume !== 'all') {
    conditions.push('volume = ?');
    params.push(filters.volume);
  }
  
  if (filters.wordClass !== 'all') {
    conditions.push('word_class LIKE ?');
    params.push(`%${filters.wordClass}%`);
  }
  
  if (filters.technique !== 'all') {
    conditions.push('technique = ?');
    params.push(filters.technique);
  }
  
  if (filters.distribution !== 'all') {
    conditions.push('distribution = ?');
    params.push(filters.distribution);
  }
  
  if (filters.hasImage) {
    conditions.push("primary_image_url IS NOT NULL AND primary_image_url != ''");
  }
  
  if (filters.hasRoboflow) {
    conditions.push('(SELECT COUNT(*) FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id) > 0');
  }
  
  if (filters.hasInstances) {
    conditions.push('(SELECT COUNT(*) FROM graphemes g WHERE g.catalog_sign_id = cs.id) > 0');
  }
  
  if (filters.hasTranslation) {
    conditions.push("english_translation IS NOT NULL AND english_translation != ''");
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

function buildBlocksWhere(query: string, filters: SearchFilters) {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (query.trim()) {
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
  
  if (filters.region !== 'all') {
    conditions.push('region = ?');
    params.push(filters.region);
  }
  
  if (filters.artifact.trim()) {
    conditions.push('artifact_code LIKE ?');
    params.push(`%${filters.artifact}%`);
  }
  
  if (filters.site.trim()) {
    conditions.push('site_name LIKE ?');
    params.push(`%${filters.site}%`);
  }
  
  if (filters.hasDate) {
    conditions.push("event_calendar IS NOT NULL AND event_calendar != ''");
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

function buildGraphemesWhere(query: string, filters: SearchFilters) {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (query.trim()) {
    conditions.push(`(
      g.grapheme_code LIKE ? OR
      g.artifact_code LIKE ? OR
      b.block_english LIKE ? OR
      b.block_maya1 LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam);
  }
  
  if (filters.region !== 'all') {
    conditions.push('b.region = ?');
    params.push(filters.region);
  }
  
  if (filters.artifact.trim()) {
    conditions.push('g.artifact_code LIKE ?');
    params.push(`%${filters.artifact}%`);
  }
  
  if (filters.site.trim()) {
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
  return { whereClause, params };
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
