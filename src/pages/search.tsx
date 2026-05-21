import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { clickableProps } from '../components/ui/ClickableCell';
import { useDropdownKeyboard } from '../hooks/useDropdownKeyboard';
import { SignCard } from '../components/search/SignCard';
import { BlockCard } from '../components/search/BlockCard';
import { GraphemeCard } from '../components/search/GraphemeCard';
import { SearchFiltersComponent } from '../components/search/SearchFilters';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { useSearchFilters } from '../hooks/useSearchFilters';
import type { SearchFilters } from '../hooks/useSearchFilters';
import { useSearch } from '../hooks/useSearch';
import { exportSearch, fetchNewConcordance } from '../lib/api';
import type { SignSearchResult, BlockSearchResult, GraphemeSearchResult } from '../../api/lib/types';

type ViewMode = 'signs' | 'blocks' | 'graphemes' | 'concordance';

const PAGE_SIZE = 48;
const CONCORDANCE_PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300;

function parseFiltersFromURL(params: URLSearchParams): Partial<SearchFilters> {
  const overrides: Partial<SearchFilters> = {};
  if (params.get('hasImage') === '1') overrides.hasImage = true;
  if (params.get('hasRoboflow') === '1') overrides.hasRoboflow = true;
  if (params.get('hasDate') === '1') overrides.hasDate = true;
  if (params.get('hasTranslation') === '1') overrides.hasTranslation = true;
  if (params.get('hasInstances') === '1') overrides.hasInstances = true;
  if (params.get('showVariants') === '1') overrides.collapseVariants = false;
  const volumes = params.get('volumes');
  if (volumes) overrides.volumes = volumes.split(',');
  const wordClasses = params.get('wordClasses');
  if (wordClasses) overrides.wordClasses = wordClasses.split(',');
  const techniques = params.get('techniques');
  if (techniques) overrides.techniques = techniques.split(',');
  const distributions = params.get('distributions');
  if (distributions) overrides.distributions = distributions.split(',');
  const regions = params.get('regions');
  if (regions) overrides.regions = regions.split(',');
  const artifact = params.get('artifact');
  if (artifact) overrides.artifact = artifact;
  const sites = params.get('sites');
  if (sites) overrides.sites = sites.split(',');
  const sort = params.get('sort');
  if (sort === 'frequency' || sort === 'completeness') overrides.sortBy = sort;
  return overrides;
}

const CATALOG_NAMES = [
  'MHD', 'TWKM', 'Thompson', 'CMGG', 'Grube', 'Tokovinine',
  'MacriVail', 'RodriguezOchoa', 'RingleSmithStark',
  'Knorozov', 'Zimmermann', 'Gates', 'Evreinov', 'RendonSpescha',
];

function toggleArr(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

function ExportDropdown({ count, label, onExport }: {
  count: number; label: string; onExport: (format: 'csv' | 'json') => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useDropdownKeyboard(open, () => setOpen(false));

  return (
    <td
      {...clickableProps(() => setOpen(!open), { ariaLabel: 'Export results' })}
      aria-expanded={open}
      aria-haspopup="menu"
      ref={ref}
      className="px-3 py-1 relative cursor-pointer focus-cell"
    >
      <span className="text-xs">Export</span>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 bg-white border-2 border-black mt-[-2px] whitespace-nowrap flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs border-b border-black">
            {count.toLocaleString()} {label}
          </div>
          <div
            {...clickableProps(() => { onExport('csv'); setOpen(false); }, { role: 'menuitem' })}
            className="px-3 py-1 text-xs cursor-pointer border-b border-black focus-cell"
          >
            Download CSV
          </div>
          <div
            {...clickableProps(() => { onExport('json'); setOpen(false); }, { role: 'menuitem' })}
            className="px-3 py-1 text-xs cursor-pointer focus-cell"
          >
            Download JSON
          </div>
        </div>
      )}
    </td>
  );
}

function CatalogDropdown({ options, selected, onToggle, onClear }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useDropdownKeyboard(open, () => setOpen(false));

  const summary = selected.length === 0
    ? '--'
    : selected.length <= 2
      ? selected.map(s => `[${s}]`).join(' ')
      : `[${selected[0]}] +${selected.length - 1}`;

  return (
    <td
      {...clickableProps(() => setOpen(!open), { ariaLabel: 'Filter by catalog' })}
      aria-expanded={open}
      aria-haspopup="listbox"
      ref={ref}
      className="px-3 py-1 relative cursor-pointer focus-cell"
    >
      <div className="w-[200px] overflow-hidden">
        <span className="text-xs block truncate">
          {selected.length > 0 ? <strong>{summary}</strong> : summary}
        </span>
      </div>
      {open && (
        <div
          className="absolute -left-[2px] -right-[2px] top-full z-50 bg-white border-2 border-black mt-[-2px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div role="listbox" aria-label="Catalogs">
            {options.map(option => (
              <div
                key={option}
                {...clickableProps(() => onToggle(option), { role: 'option', ariaSelected: selected.includes(option) })}
                className="px-3 py-1 cursor-pointer text-xs border-b border-black last:border-b-0 focus-cell"
              >
                {selected.includes(option) ? <strong>[{option}]</strong> : option}
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1 border-t-2 border-black text-xs">
              <span>{selected.length} selected</span>
              <button className="cursor-pointer no-underline text-xs font-[800]" onClick={() => onClear()}>
                [Clear]
              </button>
            </div>
          )}
        </div>
      )}
    </td>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') || '');
  const [inputFocused, setInputFocused] = useState(false);
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

  // Concordance state
  const [concordancePage, setConcordancePage] = useState(1);
  const [catalogFilters, setCatalogFilters] = useState<string[]>(() => {
    const c = searchParams.get('catalog');
    return c ? c.split(',') : [];
  });

  // Init filter overrides from URL exactly once on first render. Lazy
  // useState avoids re-parsing on subsequent renders and satisfies the
  // React 19 "no refs during render" rule.
  const [initialFilterOverrides] = useState(() => parseFiltersFromURL(searchParams));
  const { filters, updateFilter, clearFilters } = useSearchFilters(initialFilterOverrides);

  // Count only filters relevant to the current view mode
  const activeFilterCount = (() => {
    let count = 0;
    if (viewMode === 'signs') {
      if (filters.volumes.length > 0) count++;
      if (filters.techniques.length > 0) count++;
      if (filters.distributions.length > 0) count++;
      if (filters.hasImage) count++;
      if (filters.hasRoboflow) count++;
      if (filters.hasInstances) count++;
      if (filters.hasTranslation) count++;
      if (filters.collapseVariants) count++;
      if (filters.wordClasses.length > 0) count++;
    } else if (viewMode === 'blocks') {
      if (filters.hasDate) count++;
      if (filters.artifact) count++;
      if (filters.sites.length > 0) count++;
      if (filters.regions.length > 0) count++;
    } else if (viewMode === 'graphemes') {
      if (filters.artifact) count++;
      if (filters.sites.length > 0) count++;
      if (filters.hasImage) count++;
      if (filters.hasDate) count++;
      if (filters.regions.length > 0) count++;
    }
    return count;
  })();

  // Only use search hook for non-concordance modes
  const searchMode = viewMode === 'concordance' ? 'signs' : viewMode;
  const { results, totalResults, loading, error, search } = useSearch(
    searchMode, filters, debouncedQuery, page, PAGE_SIZE,
  );

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Concordance fetch via TanStack Query (cancellation + caching free).
  const { data: concordanceData, isPending: concordancePending, isFetching: concordanceFetching, error: concordanceQueryError, refetch: refetchConcordance } = useQuery({
    queryKey: ['concordance', debouncedQuery, concordancePage, catalogFilters],
    queryFn: ({ signal }) =>
      fetchNewConcordance({
        q: debouncedQuery, page: concordancePage, pageSize: CONCORDANCE_PAGE_SIZE,
        catalog: catalogFilters.length > 0 ? catalogFilters.join(',') : undefined,
        sortBy: 'catalog_code', sortDir: 'asc',
      }, signal),
    enabled: viewMode === 'concordance',
    placeholderData: keepPreviousData,
  });
  const concordanceLoading = viewMode === 'concordance' && concordancePending;
  const concordanceRefreshing = viewMode === 'concordance' && concordanceFetching && !concordancePending;
  const concordanceError = concordanceQueryError ? (concordanceQueryError.message || 'Failed to load concordance data') : null;
  const concordanceRows = concordanceData?.rows ?? [];
  const concordanceTotal = concordanceData?.total ?? 0;
  useEffect(() => { if (concordanceData) setHasSearched(true); }, [concordanceData]);

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

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (viewMode !== 'signs') params.set('mode', viewMode);
    if (viewMode === 'concordance') {
      if (concordancePage > 1) params.set('page', String(concordancePage));
      if (catalogFilters.length > 0) params.set('catalog', catalogFilters.join(','));
    } else if (page > 1) {
      params.set('page', String(page));
    }
    if (filters.hasImage) params.set('hasImage', '1');
    if (filters.hasRoboflow) params.set('hasRoboflow', '1');
    if (filters.hasDate) params.set('hasDate', '1');
    if (filters.hasTranslation) params.set('hasTranslation', '1');
    if (filters.hasInstances) params.set('hasInstances', '1');
    if (filters.volumes.length > 0) params.set('volumes', filters.volumes.join(','));
    if (filters.wordClasses.length > 0) params.set('wordClasses', filters.wordClasses.join(','));
    if (filters.techniques.length > 0) params.set('techniques', filters.techniques.join(','));
    if (filters.distributions.length > 0) params.set('distributions', filters.distributions.join(','));
    if (filters.regions.length > 0) params.set('regions', filters.regions.join(','));
    if (filters.artifact) params.set('artifact', filters.artifact);
    if (filters.sites.length > 0) params.set('sites', filters.sites.join(','));
    if (filters.collapseVariants === false) params.set('showVariants', '1');
    if (filters.sortBy !== 'code') params.set('sort', filters.sortBy);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, viewMode, page, filters, concordancePage, catalogFilters, setSearchParams]);

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
  const handleViewModeChange = useCallback((mode: ViewMode) => { setViewMode(mode); setPage(1); }, []);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    exportSearch({
      mode: viewMode === 'concordance' ? 'signs' : viewMode, q: debouncedQuery,
      volume: filters.volumes.length > 0 ? filters.volumes.join(',') : undefined,
      wordClass: filters.wordClasses.length > 0 ? filters.wordClasses.join(',') : undefined,
      technique: filters.techniques.length > 0 ? filters.techniques.join(',') : undefined,
      distribution: filters.distributions.length > 0 ? filters.distributions.join(',') : undefined,
      hasImage: filters.hasImage, hasRoboflow: filters.hasRoboflow,
      hasInstances: filters.hasInstances, hasTranslation: filters.hasTranslation, sortBy: filters.sortBy,
      region: filters.regions.length > 0 ? filters.regions.join(',') : undefined, artifact: filters.artifact, site: filters.sites.length > 0 ? filters.sites.join(',') : undefined, hasDate: filters.hasDate,
    }, format);
  }, [viewMode, debouncedQuery, filters]);

  const isLoading = viewMode === 'concordance' ? concordanceLoading : loading;

  const handlePageChange = (newPage: number) => {
    if (viewMode === 'concordance') setConcordancePage(newPage);
    else setPage(newPage);
  };

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-6">
      {/* Filters (search bar passed as top row) */}
      <SearchFiltersComponent
        searchRow={
          <tr>
            <td colSpan={5} className="px-3 py-2 cursor-text" onClick={() => searchInputRef.current?.focus()}>
              <div className="flex items-center">
                <span className="font-[800] select-none shrink-0">&gt;&nbsp;</span>
                <input
                  ref={searchInputRef}
                  type="search"
                  aria-label="Search signs, blocks, translations"
                  className="absolute opacity-0 pointer-events-none"
                  style={{ caretColor: 'transparent', fontSize: '16px' }}
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
                {inputFocused || query ? (
                  <>
                    <span className="font-[600]">{query}</span>
                    <span className="blink-cursor font-[800] select-none">|</span>
                  </>
                ) : (
                  <span className="select-none">search signs, blocks, translations...</span>
                )}
              </div>
            </td>
          </tr>
        }
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        filters={filters}
        updateFilter={updateFilter}
      />

      {/* Error */}
      {(error || concordanceError) && (
        <table className="w-auto mt-6">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">{error || concordanceError}</td>
              <td {...clickableProps(() => viewMode === 'concordance' ? refetchConcordance() : search(), { ariaLabel: 'Retry' })} className="px-3 py-2 cursor-pointer focus-cell">
                <span className="text-xs font-[800]">[Retry]</span>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Loading bar — always visible when loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <ProgressBarLoader />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && hasSearched && viewMode !== 'concordance' && results.length === 0 && (
        <table className="w-auto mt-6">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">
                No {viewMode} found.
                {query || activeFilterCount > 0 ? ' Try adjusting your search or filters.' : ''}
              </td>
              {(query || activeFilterCount > 0) && (
                <td {...clickableProps(() => { setQuery(''); clearFilters(); }, { ariaLabel: 'Clear all filters' })} className="px-3 py-2 cursor-pointer focus-cell">
                  <span className="text-xs font-[800]">[Clear All]</span>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      )}

      {/* Concordance results bar */}
      {viewMode === 'concordance' && hasSearched && (
        <div className="flex items-center justify-between mt-6 mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <div className="w-[140px]">
                    <strong>{concordanceTotal.toLocaleString()}</strong> entries
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-xs font-[800]">Catalog:</td>
                <CatalogDropdown
                  options={CATALOG_NAMES}
                  selected={catalogFilters}
                  onToggle={(v) => { setCatalogFilters(toggleArr(catalogFilters, v)); setConcordancePage(1); }}
                  onClear={() => { setCatalogFilters([]); setConcordancePage(1); }}
                />
              </tr>
            </tbody>
          </table>
          <table className="w-auto">
            <tbody>
              <tr>
                <ExportDropdown count={concordanceTotal} label="entries" onExport={handleExport} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Concordance Table */}
      {viewMode === 'concordance' && (
        <div>

          <div className={`overflow-x-auto transition-opacity ${concordanceRefreshing ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-xs uppercase w-[50px]">Image</th>
                  <th className="px-2 py-1 text-left text-xs uppercase">Code</th>
                  <th className="px-2 py-1 text-left text-xs uppercase">Catalog</th>
                  <th className="px-2 py-1 text-left text-xs uppercase">Reading</th>
                  <th className="px-2 py-1 text-left text-xs uppercase">Meaning</th>
                  <th className="px-2 py-1 text-left text-xs uppercase">Cross-References</th>
                </tr>
              </thead>
              <tbody>
                {concordanceRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16">{concordanceLoading ? '' : 'No results found'}</td></tr>
                ) : (
                  concordanceRows.map(row => (
                    <tr key={row.entry_id}>
                      <td className="px-2 py-1">
                        {row.image_url ? (
                          <img src={row.image_url} alt="" width={32} height={32} className="w-8 h-8 object-contain" />
                        ) : (
                          <span className="text-xs">--</span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <Link to={`/entry/${row.entry_id}`}>{row.catalog_code}</Link>
                      </td>
                      <td className="px-2 py-1 text-xs">{row.catalog}</td>
                      <td className="px-2 py-1 italic">{row.reading_value || '--'}</td>
                      <td className="px-2 py-1 max-w-[180px] truncate">{row.gloss_english || '--'}</td>
                      <td className="px-2 py-1">
                        {row.cross_references.slice(0, 5).map((ref) => (
                          <Link key={ref.entry_id} to={`/entry/${ref.entry_id}`} className="text-xs mr-1">
                            {ref.correspondence === 'exact' ? '=' : '≈'}{ref.catalog_code}
                          </Link>
                        ))}
                        {row.cross_references.length > 5 && (
                          <span className="text-xs">+{row.cross_references.length - 5}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Concordance pagination — same style as other modes */}
          {totalPages > 1 && (
            <table className="w-auto mt-6">
              <tbody>
                <tr>
                  {hasPrevPage && (
                    <td {...clickableProps(() => handlePageChange(currentPage - 1), { ariaLabel: 'Previous page' })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">Prev</span>
                    </td>
                  )}
                  {currentPage > 2 && (
                    <td {...clickableProps(() => handlePageChange(1), { ariaLabel: 'Page 1' })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">1</span>
                    </td>
                  )}
                  {currentPage > 3 && <td className="px-1 py-1 text-sm">...</td>}
                  {hasPrevPage && (
                    <td {...clickableProps(() => handlePageChange(currentPage - 1), { ariaLabel: `Page ${currentPage - 1}` })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">{currentPage - 1}</span>
                    </td>
                  )}
                  <td className="px-3 py-1" aria-current="page">
                    <strong>[{currentPage}]</strong>
                  </td>
                  {hasNextPage && (
                    <td {...clickableProps(() => handlePageChange(currentPage + 1), { ariaLabel: `Page ${currentPage + 1}` })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">{currentPage + 1}</span>
                    </td>
                  )}
                  {currentPage < totalPages - 2 && <td className="px-1 py-1 text-sm">...</td>}
                  {currentPage < totalPages - 1 && (
                    <td {...clickableProps(() => handlePageChange(totalPages), { ariaLabel: `Page ${totalPages}` })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">{totalPages}</span>
                    </td>
                  )}
                  {hasNextPage && (
                    <td {...clickableProps(() => handlePageChange(currentPage + 1), { ariaLabel: 'Next page' })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">Next</span>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Results bar — always visible once searched */}
      {hasSearched && viewMode !== 'concordance' && (
        <div className="flex items-center justify-between mt-6 mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <strong>{totalResults.toLocaleString()}</strong> {viewMode}
                  {query && <span> matching &quot;{query}&quot;</span>}
                  {activeFilterCount > 0 && <span>, {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>}
                </td>
              </tr>
            </tbody>
          </table>
          {viewMode === 'signs' && (
            <table className="w-auto">
              <tbody>
                <tr>
                  <td className="px-3 py-1 text-xs font-[800]">Sort:</td>
                  {([
                    { value: 'code', label: 'Code' },
                    { value: 'frequency', label: 'Freq' },
                    { value: 'completeness', label: 'Compl' },
                  ] as const).map(opt => (
                    <td key={opt.value} {...clickableProps(() => updateFilter('sortBy', opt.value), { ariaPressed: filters.sortBy === opt.value, ariaLabel: `Sort by ${opt.label}` })} className="px-3 py-1 text-center cursor-pointer focus-cell">
                      <span className="text-xs inline-grid">
                        <span className="invisible col-start-1 row-start-1 font-[800]">[{opt.label}]</span>
                        <span className="col-start-1 row-start-1">
                          {filters.sortBy === opt.value ? <strong>[{opt.label}]</strong> : opt.label}
                        </span>
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
          <table className="w-auto">
            <tbody>
              <tr>
                <ExportDropdown count={totalResults} label={viewMode} onExport={handleExport} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Regular Results */}
      {viewMode !== 'concordance' && results.length > 0 && (
        <div className={isLoading ? 'opacity-40' : ''}>

          {viewMode === 'signs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs uppercase w-[50px]">Image</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Code</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Thompson</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Reading</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Translation</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Class</th>
                    <th className="px-2 py-1 text-right text-xs uppercase">Freq</th>
                    <th className="px-2 py-1 text-right text-xs uppercase">ML</th>
                  </tr>
                </thead>
                <tbody>
                  {(results as SignSearchResult[]).map((sign) => (
                    <SignCard key={sign.id} sign={sign} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'blocks' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs uppercase w-[50px]">Image</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Block</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Artifact</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Site</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Maya</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">English</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(results as BlockSearchResult[]).map((block) => (
                    <BlockCard key={block.id} block={block} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'graphemes' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-xs uppercase w-[50px]">Image</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Code</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Reading</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Artifact</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Site</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Maya</th>
                    <th className="px-2 py-1 text-left text-xs uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(results as GraphemeSearchResult[]).map((grapheme) => (
                    <GraphemeCard key={grapheme.id} grapheme={grapheme} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <table className="w-auto mt-6">
              <tbody>
                <tr>
                  {hasPrevPage && (
                    <td className="px-3 py-1">
                      <button onClick={() => handlePageChange(currentPage - 1)} className="cursor-pointer no-underline text-sm">Prev</button>
                    </td>
                  )}
                  {currentPage > 2 && (
                    <td className="px-3 py-1">
                      <button onClick={() => handlePageChange(1)} className="cursor-pointer no-underline text-sm">1</button>
                    </td>
                  )}
                  {currentPage > 3 && <td className="px-1 py-1 text-sm">...</td>}
                  {hasPrevPage && (
                    <td className="px-3 py-1">
                      <button onClick={() => handlePageChange(currentPage - 1)} className="cursor-pointer no-underline text-sm">{currentPage - 1}</button>
                    </td>
                  )}
                  <td className="px-3 py-1">
                    <strong>[{currentPage}]</strong>
                  </td>
                  {hasNextPage && (
                    <td className="px-3 py-1">
                      <button onClick={() => handlePageChange(currentPage + 1)} className="cursor-pointer no-underline text-sm">{currentPage + 1}</button>
                    </td>
                  )}
                  {currentPage < totalPages - 2 && <td className="px-1 py-1 text-sm">...</td>}
                  {currentPage < totalPages - 1 && (
                    <td className="px-3 py-1">
                      <button onClick={() => handlePageChange(totalPages)} className="cursor-pointer no-underline text-sm">{totalPages}</button>
                    </td>
                  )}
                  {hasNextPage && (
                    <td className="px-3 py-1">
                      <button onClick={() => handlePageChange(currentPage + 1)} className="cursor-pointer no-underline text-sm">Next</button>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
