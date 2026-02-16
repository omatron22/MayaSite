import { useState, useCallback } from 'react';

export interface SearchFilters {
  // Toggles
  hasImage: boolean;
  hasRoboflow: boolean;
  hasDate: boolean;
  hasTranslation: boolean;
  hasInstances: boolean;

  // Dropdowns
  volume: string;
  wordClass: string;
  technique: string;
  distribution: string;
  region: string;

  // Text inputs
  artifact: string;
  site: string;

  // Sort (not a filter!)
  sortBy: 'code' | 'frequency' | 'completeness';
}

const defaultFilters: SearchFilters = {
  hasImage: false,
  hasRoboflow: false,
  hasDate: false,
  hasTranslation: false,
  hasInstances: false,
  volume: 'all',
  wordClass: 'all',
  technique: 'all',
  distribution: 'all',
  region: 'all',
  artifact: '',
  site: '',
  sortBy: 'code',
};

export function useSearchFilters(initialOverrides?: Partial<SearchFilters>) {
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...defaultFilters,
    ...initialOverrides,
  }));

  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(prev => ({ ...defaultFilters, sortBy: prev.sortBy }));
  }, []);

  // Count active filters - EXCLUDE sortBy since it's not a filter
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'all' && value !== '';
    return false;
  }).length;

  return {
    filters,
    updateFilter,
    clearFilters,
    activeFilterCount,
  };
}
