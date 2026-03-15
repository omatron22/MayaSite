import { useState, useCallback, useRef } from 'react';
import { searchApi } from '../lib/api';
import type { SearchFilters } from './useSearchFilters';
import type { SignSearchResult, BlockSearchResult, GraphemeSearchResult } from '../../api/lib/types';

type ViewMode = 'signs' | 'blocks' | 'graphemes';
type SearchResult = SignSearchResult | BlockSearchResult | GraphemeSearchResult;

export function useSearch(viewMode: ViewMode, filters: SearchFilters, query: string, page: number, pageSize: number) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await searchApi({
        mode: viewMode,
        q: query || undefined,
        page,
        pageSize,
        volume: filters.volume,
        wordClass: filters.wordClass,
        technique: filters.technique,
        distribution: filters.distribution,
        hasImage: filters.hasImage || undefined,
        hasRoboflow: filters.hasRoboflow || undefined,
        hasInstances: filters.hasInstances || undefined,
        hasTranslation: filters.hasTranslation || undefined,
        sortBy: filters.sortBy,
        region: filters.region,
        artifact: filters.artifact || undefined,
        site: filters.site || undefined,
        hasDate: filters.hasDate || undefined,
        collapseVariants: filters.collapseVariants || undefined,
      }, controller.signal);

      setResults(response.results as SearchResult[]);
      setTotalResults(response.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [viewMode, query, filters, page, pageSize]);

  return { results, totalResults, loading, error, search };
}
