import type {
  SearchResponse,
  SignDetailResponse,
  BlockDetailResponse,
  GraphemeDetailResponse,
  StatsResponse,
  AnalyticsResponse,
  AnalyticsDataSource,
  ConcordanceResponse,
  InferenceResponse,
  SignLookupResponse,
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
  region?: string;
  artifact?: string;
  site?: string;
  hasDate?: boolean;
}

export function searchApi(params: SearchApiParams, signal?: AbortSignal): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', params.mode);
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.volume && params.volume !== 'all') searchParams.set('volume', params.volume);
  if (params.wordClass && params.wordClass !== 'all') searchParams.set('wordClass', params.wordClass);
  if (params.technique && params.technique !== 'all') searchParams.set('technique', params.technique);
  if (params.distribution && params.distribution !== 'all') searchParams.set('distribution', params.distribution);
  if (params.hasImage) searchParams.set('hasImage', 'true');
  if (params.hasRoboflow) searchParams.set('hasRoboflow', 'true');
  if (params.hasInstances) searchParams.set('hasInstances', 'true');
  if (params.hasTranslation) searchParams.set('hasTranslation', 'true');
  if (params.sortBy && params.sortBy !== 'code') searchParams.set('sortBy', params.sortBy);
  if (params.region && params.region !== 'all') searchParams.set('region', params.region);
  if (params.artifact) searchParams.set('artifact', params.artifact);
  if (params.site) searchParams.set('site', params.site);
  if (params.hasDate) searchParams.set('hasDate', 'true');

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
  return fetchJson<StatsResponse>('/api/stats', signal);
}

// Analytics
export function fetchAnalytics(
  source: AnalyticsDataSource,
  period?: string,
  region?: string,
  signal?: AbortSignal,
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  params.set('source', source);
  if (period && period !== 'all') params.set('period', period);
  if (region && region !== 'all') params.set('region', region);
  return fetchJson<AnalyticsResponse>(`/api/analytics?${params}`, signal);
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
  if (params.volume && params.volume !== 'all') searchParams.set('volume', params.volume);
  if (params.wordClass && params.wordClass !== 'all') searchParams.set('wordClass', params.wordClass);
  if (params.technique && params.technique !== 'all') searchParams.set('technique', params.technique);
  if (params.distribution && params.distribution !== 'all') searchParams.set('distribution', params.distribution);
  if (params.hasImage) searchParams.set('hasImage', 'true');
  if (params.hasRoboflow) searchParams.set('hasRoboflow', 'true');
  if (params.hasInstances) searchParams.set('hasInstances', 'true');
  if (params.hasTranslation) searchParams.set('hasTranslation', 'true');
  if (params.sortBy && params.sortBy !== 'code') searchParams.set('sortBy', params.sortBy);
  if (params.region && params.region !== 'all') searchParams.set('region', params.region);
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

// Concordance
export interface ConcordanceApiParams {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
  hasThompson?: boolean;
  hasZender?: boolean;
  hasKettunen?: boolean;
  hasGronemeyer?: boolean;
}

export function fetchConcordance(params: ConcordanceApiParams, signal?: AbortSignal): Promise<ConcordanceResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.hasThompson) searchParams.set('hasThompson', 'true');
  if (params.hasZender) searchParams.set('hasZender', 'true');
  if (params.hasKettunen) searchParams.set('hasKettunen', 'true');
  if (params.hasGronemeyer) searchParams.set('hasGronemeyer', 'true');
  return fetchJson<ConcordanceResponse>(`/api/concordance?${searchParams}`, signal);
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
  return fetchJson<KerrResponse>(`/api/kerr?${searchParams}`, signal);
}

// CMHI images
export interface CmhiResponse {
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
  return fetchJson<CmhiResponse>(`/api/cmhi?${searchParams}`, signal);
}

export { ApiError };
