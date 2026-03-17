import type {
  SearchResponse,
  SignDetailResponse,
  BlockDetailResponse,
  GraphemeDetailResponse,
  StatsResponse,
  InferenceResponse,
  SignLookupResponse,
  NewConcordanceResponse,
} from '../../api/lib/types';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json();
}

// Search
export interface SearchApiParams {
  mode: 'signs' | 'blocks' | 'graphemes';
  q?: string;
  page?: number;
  pageSize?: number;
  volume?: string;
  wordClass?: string;
  technique?: string;
  distribution?: string;
  hasImage?: boolean;
  hasRoboflow?: boolean;
  hasInstances?: boolean;
  hasTranslation?: boolean;
  sortBy?: 'code' | 'frequency' | 'completeness';
  region?: string; // comma-separated for multi-select
  artifact?: string;
  site?: string;
  hasDate?: boolean;
  collapseVariants?: boolean;
}

export function searchApi(params: SearchApiParams, signal?: AbortSignal): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', params.mode);
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.volume) searchParams.set('volume', params.volume);
  if (params.wordClass) searchParams.set('wordClass', params.wordClass);
  if (params.technique) searchParams.set('technique', params.technique);
  if (params.distribution) searchParams.set('distribution', params.distribution);
  if (params.hasImage) searchParams.set('hasImage', 'true');
  if (params.hasRoboflow) searchParams.set('hasRoboflow', 'true');
  if (params.hasInstances) searchParams.set('hasInstances', 'true');
  if (params.hasTranslation) searchParams.set('hasTranslation', 'true');
  if (params.sortBy && params.sortBy !== 'code') searchParams.set('sortBy', params.sortBy);
  if (params.region) searchParams.set('region', params.region);
  if (params.artifact) searchParams.set('artifact', params.artifact);
  if (params.site) searchParams.set('site', params.site);
  if (params.hasDate) searchParams.set('hasDate', 'true');
  if (params.collapseVariants) searchParams.set('collapseVariants', 'true');

  return fetchJson<SearchResponse>(`/api/search?${searchParams}`, signal);
}

// Sign detail
export function fetchSign(id: number, signal?: AbortSignal): Promise<SignDetailResponse> {
  return fetchJson<SignDetailResponse>(`/api/signs/${id}`, signal);
}

// Block detail
export function fetchBlock(id: number, signal?: AbortSignal): Promise<BlockDetailResponse> {
  return fetchJson<BlockDetailResponse>(`/api/blocks/${id}`, signal);
}

// Grapheme detail
export function fetchGrapheme(id: number, signal?: AbortSignal): Promise<GraphemeDetailResponse> {
  return fetchJson<GraphemeDetailResponse>(`/api/graphemes/${id}`, signal);
}

// Stats
export function fetchStats(signal?: AbortSignal): Promise<StatsResponse> {
  return fetchJson<StatsResponse>('/api/meta?type=stats', signal);
}


// Export search results as CSV/JSON
export async function exportSearch(
  params: SearchApiParams,
  format: 'csv' | 'json',
): Promise<void> {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', params.mode);
  searchParams.set('export', 'true');
  if (params.q) searchParams.set('q', params.q);
  if (params.volume) searchParams.set('volume', params.volume);
  if (params.wordClass) searchParams.set('wordClass', params.wordClass);
  if (params.technique) searchParams.set('technique', params.technique);
  if (params.distribution) searchParams.set('distribution', params.distribution);
  if (params.hasImage) searchParams.set('hasImage', 'true');
  if (params.hasRoboflow) searchParams.set('hasRoboflow', 'true');
  if (params.hasInstances) searchParams.set('hasInstances', 'true');
  if (params.hasTranslation) searchParams.set('hasTranslation', 'true');
  if (params.sortBy && params.sortBy !== 'code') searchParams.set('sortBy', params.sortBy);
  if (params.region) searchParams.set('region', params.region);
  if (params.artifact) searchParams.set('artifact', params.artifact);
  if (params.site) searchParams.set('site', params.site);
  if (params.hasDate) searchParams.set('hasDate', 'true');

  const response = await fetchJson<SearchResponse>(`/api/search?${searchParams}`);

  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === 'json') {
    content = JSON.stringify(response.results, null, 2);
    mimeType = 'application/json';
    extension = 'json';
  } else {
    const rows = response.results as unknown as Record<string, unknown>[];
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      ),
    ];
    content = csvRows.join('\n');
    mimeType = 'text/csv';
    extension = 'csv';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maya-${params.mode}-export.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}


// Inference
export async function runInference(imageBase64: string, signal?: AbortSignal): Promise<InferenceResponse> {
  const res = await fetch('/api/inference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json();
}

// Sign lookup by codes
export function lookupSigns(codes: string[], signal?: AbortSignal): Promise<SignLookupResponse> {
  return fetchJson<SignLookupResponse>(`/api/signs/lookup?codes=${codes.join(',')}`, signal);
}

// Kerr vessels
export interface KerrSearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface KerrResponse {
  results: Array<{
    id: number;
    k_number: string;
    k_num: number;
    description: string | null;
    image_url: string;
    still_url: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export function fetchKerr(params: KerrSearchParams, signal?: AbortSignal): Promise<KerrResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  return fetchJson<KerrResponse>(`/api/collections?source=kerr&${searchParams}`, signal);
}

// CMHI images
export interface CmhiResponse {
  total: number;
  images: Array<{
    id: number;
    site_name: string;
    site_code: string;
    image_url: string;
    filename: string;
    image_type: string;
    monument_type: string | null;
    monument_number: string | null;
  }>;
  sites: Array<{
    site_name: string;
    site_code: string;
    image_type: string;
    count: number;
  }>;
}

export function fetchCmhi(
  params: { site?: string; type?: string; monument?: string },
  signal?: AbortSignal,
): Promise<CmhiResponse> {
  const searchParams = new URLSearchParams();
  if (params.site) searchParams.set('site', params.site);
  if (params.type) searchParams.set('type', params.type);
  if (params.monument) searchParams.set('monument', params.monument);
  return fetchJson<CmhiResponse>(`/api/collections?source=cmhi&${searchParams}`, signal);
}

// New concordance API
export interface NewConcordanceApiParams {
  q?: string;
  page?: number;
  pageSize?: number;
  catalog?: string;
  sortBy?: string;
  sortDir?: string;
}

export function fetchNewConcordance(params: NewConcordanceApiParams, signal?: AbortSignal): Promise<NewConcordanceResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'concordance');
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.catalog) searchParams.set('catalog', params.catalog);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  return fetchJson<NewConcordanceResponse>(`/api/search?${searchParams}`, signal);
}

// Catalog entry detail (via sign endpoint with legacy ID)
export interface CatalogEntryDetail {
  entry_id: string;
  catalog: string;
  catalog_code: string;
  reading_value: string | null;
  gloss_english: string | null;
  image_url: string | null;
  cross_references: {
    entry_id: string;
    catalog: string;
    catalog_code: string;
    correspondence: string;
  }[];
}

// Person detail
export interface PersonDetailResponse {
  person: {
    person_id: string;
    name: string;
    source: string;
    site_name: string | null;
    notes: string | null;
  };
  blocks: Array<{
    id: number;
    mhd_block_id: string;
    artifact_code: string;
    site_name: string | null;
    region: string | null;
    block_english: string | null;
    block_maya1: string | null;
    event_calendar: string | null;
    event_gregorian: string | null;
    block_img: string | null;
    role: string;
  }>;
  sites: Array<{
    site_name: string;
    count: number;
  }>;
  totalBlocks: number;
}

export function fetchPerson(personId: string, signal?: AbortSignal): Promise<PersonDetailResponse> {
  return fetchJson<PersonDetailResponse>(`/api/search?mode=person_detail&personId=${encodeURIComponent(personId)}`, signal);
}

export interface PersonSearchResponse {
  results: Array<{
    person_id: string;
    name: string;
    source: string;
    site_name: string | null;
    notes: string | null;
    block_count: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export function fetchPersons(params: { q?: string; page?: number; source?: string }, signal?: AbortSignal): Promise<PersonSearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'persons');
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.source) searchParams.set('source', params.source);
  return fetchJson<PersonSearchResponse>(`/api/search?${searchParams}`, signal);
}

export { ApiError };
