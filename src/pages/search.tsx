import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SignCard } from '../components/search/SignCard';
import { BlockCard } from '../components/search/BlockCard';
import { GraphemeCard } from '../components/search/GraphemeCard';
import { SearchFiltersComponent } from '../components/search/SearchFilters';
import { SignCardSkeleton, BlockCardSkeleton, GraphemeCardSkeleton } from '../components/ui/Skeleton';
import { useSearchFilters } from '../hooks/useSearchFilters';
import type { SearchFilters } from '../hooks/useSearchFilters';
import { useSearch } from '../hooks/useSearch';
import { exportSearch, fetchConcordance, fetchNewConcordance } from '../lib/api';
import type { SignSearchResult, BlockSearchResult, GraphemeSearchResult, ConcordanceRow, NewConcordanceRow } from '../../api/lib/types';

type ViewMode = 'signs' | 'blocks' | 'graphemes' | 'concordance';
type SortCol = 'mhd_code' | 'graphcode' | 'thompson_code' | 'zender_code' | 'kettunen_code' | 'gronemeyer_code' | 'syllabic_value' | 'english_translation' | 'bonn_sign_number';
type SortDir = 'asc' | 'desc';

const EXAMPLES = ['001', 'T585', 'ba', 'jaguar', 'Palenque'];
const PAGE_SIZE = 48;
const CONCORDANCE_PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300;

const CONCORDANCE_COLUMNS: { key: SortCol; label: string }[] = [
  { key: 'mhd_code', label: 'MHD Code' },
  { key: 'graphcode', label: 'Graph Code' },
  { key: 'thompson_code', label: 'Thompson' },
  { key: 'zender_code', label: 'Zender (Bonn)' },
  { key: 'kettunen_code', label: 'Kettunen' },
  { key: 'gronemeyer_code', label: 'Gronemeyer' },
  { key: 'bonn_sign_number', label: 'Bonn' },
  { key: 'syllabic_value', label: 'Syllabic' },
  { key: 'english_translation', label: 'English' },
];

function parseFiltersFromURL(params: URLSearchParams): Partial<SearchFilters> {
  const overrides: Partial<SearchFilters> = {};
  if (params.get('hasImage') === '1') overrides.hasImage = true;
  if (params.get('hasRoboflow') === '1') overrides.hasRoboflow = true;
  if (params.get('hasDate') === '1') overrides.hasDate = true;
  if (params.get('hasTranslation') === '1') overrides.hasTranslation = true;
  if (params.get('hasInstances') === '1') overrides.hasInstances = true;
  if (params.get('showVariants') === '1') overrides.collapseVariants = false;
  const volume = params.get('volume');
  if (volume) overrides.volume = volume;
  const wordClass = params.get('wordClass');
  if (wordClass) overrides.wordClass = wordClass;
  const technique = params.get('technique');
  if (technique) overrides.technique = technique;
  const distribution = params.get('distribution');
  if (distribution) overrides.distribution = distribution;
  const region = params.get('region');
  if (region) overrides.region = region;
  const artifact = params.get('artifact');
  if (artifact) overrides.artifact = artifact;
  const site = params.get('site');
  if (site) overrides.site = site;
  const sort = params.get('sort');
  if (sort === 'frequency' || sort === 'completeness') overrides.sortBy = sort;
  return overrides;
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const mode = searchParams.get('mode');
    if (mode === 'blocks' || mode === 'graphemes' || mode === 'concordance') return mode;
    return 'signs';
  });
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });
  const [hasSearched, setHasSearched] = useState(false);

  // Concordance state (legacy)
  const [concordanceRows, setConcordanceRows] = useState<ConcordanceRow[]>([]);
  const [concordanceTotal, setConcordanceTotal] = useState(0);
  const [concordancePage, setConcordancePage] = useState(1);
  const [concordanceSortBy, setConcordanceSortBy] = useState<SortCol>(() => {
    const csort = searchParams.get('csort');
    return csort && ['mhd_code', 'graphcode', 'thompson_code', 'zender_code', 'kettunen_code', 'gronemeyer_code', 'syllabic_value', 'english_translation', 'bonn_sign_number'].includes(csort)
      ? csort as SortCol : 'mhd_code';
  });
  const [concordanceSortDir, setConcordanceSortDir] = useState<SortDir>(() => searchParams.get('cdir') === 'desc' ? 'desc' : 'asc');
  const [concordanceFilters, setConcordanceFilters] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const key of ['hasThompson', 'hasZender', 'hasKettunen', 'hasGronemeyer']) {
      if (searchParams.get(key) === '1') f[key] = true;
    }
    return f;
  });
  const [concordanceLoading, setConcordanceLoading] = useState(false);
  const [concordanceError, setConcordanceError] = useState<string | null>(null);
  // New concordance state
  const [newConcordanceRows, setNewConcordanceRows] = useState<NewConcordanceRow[]>([]);
  const [, setNewConcordanceTotal] = useState(0);
  const [catalogFilter, setCatalogFilter] = useState(() => searchParams.get('catalog') || '');
  const [useNewConcordance, setUseNewConcordance] = useState(() => searchParams.get('cversion') !== 'legacy');

  const initialFilterOverrides = useRef(parseFiltersFromURL(searchParams)).current;
  const { filters, updateFilter, clearFilters, activeFilterCount } = useSearchFilters(initialFilterOverrides);

  // Only use search hook for non-concordance modes
  const searchMode = viewMode === 'concordance' ? 'signs' : viewMode;
  const { results, totalResults, loading, error, search } = useSearch(
    searchMode, filters, debouncedQuery, page, PAGE_SIZE,
  );

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalPages = viewMode === 'concordance'
    ? Math.ceil(concordanceTotal / CONCORDANCE_PAGE_SIZE)
    : Math.ceil(totalResults / PAGE_SIZE);
  const currentPage = viewMode === 'concordance' ? concordancePage : page;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Debounce query
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_DELAY);
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [query]);

  // Reset page on filter/query/mode change
  useEffect(() => { setPage(1); setConcordancePage(1); }, [debouncedQuery, viewMode, filters]);

  // Execute search (non-concordance)
  useEffect(() => {
    if (viewMode !== 'concordance') {
      search().then(() => setHasSearched(true));
    }
  }, [search, viewMode]);

  // Concordance fetch
  useEffect(() => {
    if (viewMode !== 'concordance') return;

    setConcordanceLoading(true);
    setConcordanceError(null);
    const controller = new AbortController();

    if (useNewConcordance) {
      fetchNewConcordance({
        q: debouncedQuery, page: concordancePage, pageSize: CONCORDANCE_PAGE_SIZE,
        catalog: catalogFilter, sortBy: 'catalog_code', sortDir: concordanceSortDir,
      }, controller.signal)
        .then(data => {
          setNewConcordanceRows(data.rows);
          setNewConcordanceTotal(data.total);
          setConcordanceTotal(data.total);
          setHasSearched(true);
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          // Fall back to legacy if new tables don't exist
          setUseNewConcordance(false);
        })
        .finally(() => setConcordanceLoading(false));
    } else {
      fetchConcordance({
        q: debouncedQuery, page: concordancePage, pageSize: CONCORDANCE_PAGE_SIZE,
        sortBy: concordanceSortBy, sortDir: concordanceSortDir, ...concordanceFilters,
      }, controller.signal)
        .then(data => {
          setConcordanceRows(data.rows);
          setConcordanceTotal(data.total);
          setHasSearched(true);
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setConcordanceError(err instanceof Error ? err.message : 'Failed to load concordance data');
        })
        .finally(() => setConcordanceLoading(false));
    }

    return () => controller.abort();
  }, [viewMode, debouncedQuery, concordancePage, concordanceSortBy, concordanceSortDir, concordanceFilters, useNewConcordance, catalogFilter]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (viewMode !== 'signs') params.set('mode', viewMode);
    if (viewMode === 'concordance') {
      if (concordancePage > 1) params.set('page', String(concordancePage));
      if (concordanceSortBy !== 'mhd_code') params.set('csort', concordanceSortBy);
      if (concordanceSortDir !== 'asc') params.set('cdir', concordanceSortDir);
      for (const [key, val] of Object.entries(concordanceFilters)) {
        if (val) params.set(key, '1');
      }
    } else if (page > 1) {
      params.set('page', String(page));
    }
    if (filters.hasImage) params.set('hasImage', '1');
    if (filters.hasRoboflow) params.set('hasRoboflow', '1');
    if (filters.hasDate) params.set('hasDate', '1');
    if (filters.hasTranslation) params.set('hasTranslation', '1');
    if (filters.hasInstances) params.set('hasInstances', '1');
    if (filters.volume !== 'all') params.set('volume', filters.volume);
    if (filters.wordClass !== 'all') params.set('wordClass', filters.wordClass);
    if (filters.technique !== 'all') params.set('technique', filters.technique);
    if (filters.distribution !== 'all') params.set('distribution', filters.distribution);
    if (filters.region !== 'all') params.set('region', filters.region);
    if (filters.artifact) params.set('artifact', filters.artifact);
    if (filters.site) params.set('site', filters.site);
    if (filters.sortBy !== 'code') params.set('sort', filters.sortBy);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, viewMode, page, filters, concordancePage, concordanceSortBy, concordanceSortDir, concordanceFilters, setSearchParams]);

  // "/" keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), []);
  const handleExampleClick = useCallback((example: string) => { setQuery(example); searchInputRef.current?.focus(); }, []);
  const handleViewModeChange = useCallback((mode: ViewMode) => { setViewMode(mode); setPage(1); }, []);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    exportSearch({
      mode: viewMode === 'concordance' ? 'signs' : viewMode, q: debouncedQuery,
      volume: filters.volume, wordClass: filters.wordClass, technique: filters.technique,
      distribution: filters.distribution, hasImage: filters.hasImage, hasRoboflow: filters.hasRoboflow,
      hasInstances: filters.hasInstances, hasTranslation: filters.hasTranslation, sortBy: filters.sortBy,
      region: filters.region, artifact: filters.artifact, site: filters.site, hasDate: filters.hasDate,
    }, format);
  }, [viewMode, debouncedQuery, filters]);

  const toggleConcordanceSort = useCallback((col: SortCol) => {
    if (concordanceSortBy === col) {
      setConcordanceSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setConcordanceSortBy(col);
      setConcordanceSortDir('asc');
    }
    setConcordancePage(1);
  }, [concordanceSortBy]);

  const toggleConcordanceFilter = useCallback((key: string) => {
    setConcordanceFilters(f => {
      const next = { ...f };
      if (next[key]) delete next[key]; else next[key] = true;
      return next;
    });
    setConcordancePage(1);
  }, []);

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (concordanceSortBy !== col) return <ArrowUpDown size={12} className="text-gray-300" />;
    return concordanceSortDir === 'asc' ? <ArrowUp size={12} className="text-gray-900" /> : <ArrowDown size={12} className="text-gray-900" />;
  };

  const isLoading = viewMode === 'concordance' ? concordanceLoading : loading;
  const paginationBtn = "flex items-center gap-1.5 px-3 py-2 text-gray-700 border border-gray-300 rounded-md cursor-pointer text-sm font-medium transition-colors hover:not-disabled:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed";
  const paginationPage = (active: boolean) => `border border-gray-300 px-3 py-2 rounded-md cursor-pointer text-sm font-medium min-w-[2.5rem] transition-colors ${
    active ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-600 hover:bg-gray-50'
  }`;

  const handlePageChange = (newPage: number) => {
    if (viewMode === 'concordance') setConcordancePage(newPage);
    else setPage(newPage);
  };

  return (
    <div className="p-6 max-md:p-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Search */}
        <div className="flex flex-col gap-3 mb-6 max-w-[1100px] mx-auto">
          <div className="relative flex-1 min-w-0 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full py-2.5 pr-10 pl-10 bg-white border border-gray-300 rounded-md text-gray-900 text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              placeholder="Search by code, syllabic value, translation, or artifact..."
              value={query}
              onChange={handleQueryChange}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-xs font-medium">Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded text-xs font-medium transition-colors hover:bg-gray-200"
                onClick={() => handleExampleClick(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          <SearchFiltersComponent
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            concordanceFilters={concordanceFilters}
            onConcordanceFilterToggle={toggleConcordanceFilter}
          />
        </div>

        {/* Error */}
        {(error || concordanceError) && (
          <div className="text-center py-8 text-red-600">
            <p className="mb-4">{error || concordanceError}</p>
            <button className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50" onClick={() => viewMode === 'concordance' ? setConcordanceError(null) : search()}>Retry</button>
          </div>
        )}

        {/* Skeleton Loading */}
        {isLoading && viewMode !== 'concordance' && (
          <div>
            {viewMode === 'signs' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                {Array.from({ length: 12 }).map((_, i) => <SignCardSkeleton key={i} />)}
              </div>
            )}
            {viewMode === 'blocks' && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => <BlockCardSkeleton key={i} />)}
              </div>
            )}
            {viewMode === 'graphemes' && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => <GraphemeCardSkeleton key={i} />)}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && hasSearched && viewMode !== 'concordance' && results.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">No {viewMode} found</p>
            <p className="text-gray-400 text-sm mb-4">
              {query || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Enter a search term or select filters to get started'}
            </p>
            {(query || activeFilterCount > 0) && (
              <button className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50" onClick={() => { setQuery(''); clearFilters(); }}>
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Concordance Table */}
        {viewMode === 'concordance' && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Version toggle + catalog filter */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <button
                onClick={() => setUseNewConcordance(!useNewConcordance)}
                className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                  useNewConcordance ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                {useNewConcordance ? 'New Concordance' : 'Legacy View'}
              </button>
              {useNewConcordance && (
                <select
                  value={catalogFilter}
                  onChange={(e) => { setCatalogFilter(e.target.value); setConcordancePage(1); }}
                  className="py-1 px-2 bg-white text-gray-700 border border-gray-300 rounded text-xs"
                >
                  <option value="">All Catalogs</option>
                  <option value="MHD">MHD</option>
                  <option value="TWKM">TWKM</option>
                  <option value="Thompson">Thompson</option>
                  <option value="CMGG">CMGG</option>
                  <option value="Grube">Grube</option>
                  <option value="Tokovinine">Tokovinine</option>
                  <option value="MacriVail">Macri & Vail</option>
                  <option value="RodriguezOchoa">Rodriguez Ochoa</option>
                  <option value="RingleSmithStark">Ringle & Smith-Stark</option>
                  <option value="Knorozov">Knorozov</option>
                  <option value="Zimmermann">Zimmermann</option>
                  <option value="Gates">Gates</option>
                  <option value="Evreinov">Evreinov</option>
                  <option value="RendonSpescha">Rendon Spescha</option>
                </select>
              )}
            </div>

            <div className="overflow-x-auto">
              {useNewConcordance ? (
                /* New concordance table */
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50 w-[50px]">Image</th>
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50">Code</th>
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50">Catalog</th>
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50">Reading</th>
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50">Meaning</th>
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50">Cross-References</th>
                    </tr>
                  </thead>
                  <tbody>
                    {concordanceLoading ? (
                      <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="loading-spinner mx-auto"></div></td></tr>
                    ) : newConcordanceRows.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-16 text-gray-400">No results found</td></tr>
                    ) : (
                      newConcordanceRows.map(row => (
                        <tr key={row.entry_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2">
                            {row.image_url ? (
                              <img src={row.image_url} alt="" width={32} height={32} className="w-8 h-8 object-contain bg-gray-50 rounded border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-gray-300 text-xs">--</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Link to={`/entry/${row.entry_id}`} className="text-blue-600 no-underline hover:underline font-medium text-sm">
                              {row.catalog_code}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{row.catalog}</span>
                          </td>
                          <td className="px-3 py-2 text-blue-600 italic">{row.reading_value || '--'}</td>
                          <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{row.gloss_english || '--'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.cross_references.slice(0, 5).map((ref) => (
                                <Link
                                  key={ref.entry_id}
                                  to={`/entry/${ref.entry_id}`}
                                  className="no-underline"
                                >
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] border ${
                                    ref.correspondence === 'exact'
                                      ? 'bg-green-50 border-green-200 text-green-700'
                                      : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                  }`}>
                                    {ref.correspondence === 'exact' ? '=' : '≈'}
                                    <span className="font-medium">{ref.catalog_code}</span>
                                    <span className="opacity-60">{ref.catalog}</span>
                                  </span>
                                </Link>
                              ))}
                              {row.cross_references.length > 5 && (
                                <span className="text-[11px] text-gray-400">+{row.cross_references.length - 5}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                /* Legacy concordance table */
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-gray-500 font-medium text-xs uppercase tracking-wide bg-gray-50 w-[50px]">Image</th>
                      {CONCORDANCE_COLUMNS.map(col => (
                        <th key={col.key} className="px-3 py-2.5 text-left bg-gray-50">
                          <button
                            onClick={() => toggleConcordanceSort(col.key)}
                            className="inline-flex items-center gap-1 text-gray-500 font-medium text-xs uppercase tracking-wide bg-transparent border-none cursor-pointer hover:text-gray-900 transition-colors"
                          >
                            {col.label}
                            <SortIcon col={col.key} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {concordanceLoading ? (
                      <tr><td colSpan={10} className="text-center py-16 text-gray-400"><div className="loading-spinner mx-auto"></div></td></tr>
                    ) : concordanceRows.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-16 text-gray-400">No results found</td></tr>
                    ) : (
                      concordanceRows.map(row => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2">
                            {row.primary_image_url ? (
                              <img src={row.primary_image_url} alt="" width={32} height={32} className="w-8 h-8 object-contain bg-gray-50 rounded border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-gray-300 text-xs">--</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Link to={`/sign/${row.id}`} className="text-blue-600 no-underline hover:underline font-medium text-sm">
                              {row.mhd_code}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{row.graphcode || '--'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.thompson_code ? `T${row.thompson_code}` : '--'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.zender_code || '--'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.kettunen_code || '--'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.gronemeyer_code || '--'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.bonn_sign_number || '--'}</td>
                          <td className="px-3 py-2 text-blue-600 italic">{row.syllabic_value || '--'}</td>
                          <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{row.english_translation || '--'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Concordance pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-200">
                <div className="text-gray-400 text-sm">{concordanceTotal.toLocaleString()} entries</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={!hasPrevPage}
                    className="p-1.5 border border-gray-300 rounded text-gray-500 disabled:opacity-30 hover:text-gray-900 transition-colors cursor-pointer disabled:cursor-default"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-gray-500 text-sm px-2">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={!hasNextPage}
                    className="p-1.5 border border-gray-300 rounded text-gray-500 disabled:opacity-30 hover:text-gray-900 transition-colors cursor-pointer disabled:cursor-default"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regular Results */}
        {!isLoading && viewMode !== 'concordance' && results.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 text-sm text-gray-600">
              <div className="flex items-baseline gap-2 flex-wrap">
                <strong className="text-gray-900 font-semibold">{totalResults.toLocaleString()}</strong> {viewMode}
                {(query || activeFilterCount > 0) && (
                  <span>
                    {query && <span> matching &quot;{query}&quot;</span>}
                    {activeFilterCount > 0 && <span> with {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-600 font-medium hover:bg-gray-50 transition-colors" onClick={() => handleExport('csv')}>
                  <Download size={11} /> CSV
                </button>
                <button className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-600 font-medium hover:bg-gray-50 transition-colors" onClick={() => handleExport('json')}>
                  <Download size={11} /> JSON
                </button>
                {totalPages > 1 && <span className="text-gray-400 ml-2 text-xs">Page {page} of {totalPages}</span>}
              </div>
            </div>

            <div>
              {viewMode === 'signs' && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!filters.collapseVariants}
                        onChange={() => updateFilter('collapseVariants', !filters.collapseVariants)}
                        className="rounded border-gray-300 text-blue-600 w-3.5 h-3.5"
                      />
                      Show variants
                    </label>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                    {(results as SignSearchResult[]).map((sign) => (
                      <SignCard key={sign.id} sign={sign} />
                    ))}
                  </div>
                </>
              )}

              {viewMode === 'blocks' && (
                <div className="flex flex-col gap-3">
                  {(results as BlockSearchResult[]).map((block) => (
                    <BlockCard key={block.id} block={block} />
                  ))}
                </div>
              )}

              {viewMode === 'graphemes' && (
                <div className="flex flex-col gap-3">
                  {(results as GraphemeSearchResult[]).map((grapheme) => (
                    <GraphemeCard key={grapheme.id} grapheme={grapheme} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 py-6 flex-wrap">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={!hasPrevPage} className={paginationBtn}>
                  <ChevronLeft size={14} />
                  <span className="max-md:hidden">Previous</span>
                </button>

                <div className="flex gap-1 items-center">
                  {currentPage > 2 && (
                    <>
                      <button onClick={() => handlePageChange(1)} className={paginationPage(false)}>1</button>
                      {currentPage > 3 && <span className="text-gray-400 px-2">...</span>}
                    </>
                  )}
                  {hasPrevPage && <button onClick={() => handlePageChange(currentPage - 1)} className={paginationPage(false)}>{currentPage - 1}</button>}
                  <button className={paginationPage(true)}>{currentPage}</button>
                  {hasNextPage && <button onClick={() => handlePageChange(currentPage + 1)} className={paginationPage(false)}>{currentPage + 1}</button>}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="text-gray-400 px-2">...</span>}
                      <button onClick={() => handlePageChange(totalPages)} className={paginationPage(false)}>{totalPages}</button>
                    </>
                  )}
                </div>

                <button onClick={() => handlePageChange(currentPage + 1)} disabled={!hasNextPage} className={paginationBtn}>
                  <span className="max-md:hidden">Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
