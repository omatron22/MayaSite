// src/pages/search.tsx - OPTIMIZED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { GraphemeModal } from '../components/GraphemeModal';
import { BlockModal } from '../components/BlockModal';
import { SignCard } from '../components/search/SignCard';
import { BlockCard } from '../components/search/BlockCard';
import { GraphemeCard } from '../components/search/GraphemeCard';
import { SearchFiltersComponent } from '../components/search/SearchFilters';
import { SearchIcon } from '../components/search/icons';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { useSearch } from '../hooks/useSearch';
import './search.css';

type ViewMode = 'signs' | 'blocks' | 'graphemes';

const EXAMPLES = ['001', 'T585', 'ba', 'jaguar', 'Palenque'];
const PAGE_SIZE = 48;
const DEBOUNCE_DELAY = 300;

export function SearchPage() {
  // State
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('signs');
  const [page, setPage] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Modal states
  const [selectedGraphemeId, setSelectedGraphemeId] = useState<number | null>(null);
  const [selectedGraphemeIndex, setSelectedGraphemeIndex] = useState(-1);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(-1);

  // Custom hooks
  const { filters, updateFilter, clearFilters, activeFilterCount } = useSearchFilters();
  const { results, totalResults, loading, search } = useSearch(
    viewMode,
    filters,
    debouncedQuery,
    page,
    PAGE_SIZE
  );

  // Refs
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Computed values
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Debounce query
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  // Trigger search when dependencies change
  useEffect(() => {
    search();
  }, [search]);

  // Reset page when filters or query change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, viewMode, filters]);

  // Handlers
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
  }, []);

  const handleGraphemeClick = useCallback((id: number, index: number) => {
    setSelectedGraphemeId(id);
    setSelectedGraphemeIndex(index);
  }, []);

  const handleNextGrapheme = useCallback(() => {
    if (selectedGraphemeIndex < results.length - 1) {
      const nextIndex = selectedGraphemeIndex + 1;
      setSelectedGraphemeId(results[nextIndex].id);
      setSelectedGraphemeIndex(nextIndex);
    }
  }, [selectedGraphemeIndex, results]);

  const handlePrevGrapheme = useCallback(() => {
    if (selectedGraphemeIndex > 0) {
      const prevIndex = selectedGraphemeIndex - 1;
      setSelectedGraphemeId(results[prevIndex].id);
      setSelectedGraphemeIndex(prevIndex);
    }
  }, [selectedGraphemeIndex, results]);

  const handleBlockClick = useCallback((id: number, index: number) => {
    setSelectedBlockId(id);
    setSelectedBlockIndex(index);
  }, []);

  const handleNextBlock = useCallback(() => {
    if (selectedBlockIndex < results.length - 1) {
      const nextIndex = selectedBlockIndex + 1;
      setSelectedBlockId(results[nextIndex].id);
      setSelectedBlockIndex(nextIndex);
    }
  }, [selectedBlockIndex, results]);

  const handlePrevBlock = useCallback(() => {
    if (selectedBlockIndex > 0) {
      const prevIndex = selectedBlockIndex - 1;
      setSelectedBlockId(results[prevIndex].id);
      setSelectedBlockIndex(prevIndex);
    }
  }, [selectedBlockIndex, results]);

  return (
    <div className="search-page">
      <div className="search-container">
        {/* Hero */}
        <div className="hero-compact">
          <h1>Maya Hieroglyphic Database</h1>
          <div className="stats-inline">
            <span className="stat-item"><strong>3,141</strong> Signs</span>
            <span className="stat-divider">•</span>
            <span className="stat-item"><strong>208,000</strong> Blocks</span>
            <span className="stat-divider">•</span>
            <span className="stat-item"><strong>10,665</strong> ML Examples</span>
          </div>
        </div>

        {/* Search */}
        <div className="search-compact">
          <div className="search-row">
            <div className="search-input-wrapper">
              <SearchIcon />
              <input
                type="text"
                className="search-input"
                placeholder="Search by code, syllabic value, translation, or artifact..."
                value={query}
                onChange={handleQueryChange}
              />
            </div>
            
            {/* View Mode Toggle */}
            <div className="view-mode-toggle-compact">
              <button 
                className={viewMode === 'signs' ? 'active' : ''} 
                onClick={() => setViewMode('signs')}
              >
                Signs
              </button>
              <button 
                className={viewMode === 'blocks' ? 'active' : ''} 
                onClick={() => setViewMode('blocks')}
              >
                Blocks
              </button>
              <button 
                className={viewMode === 'graphemes' ? 'active' : ''} 
                onClick={() => setViewMode('graphemes')}
              >
                Graphemes
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="search-examples-compact">
            {EXAMPLES.map(ex => (
              <button 
                key={ex} 
                className="example-btn-compact" 
                onClick={() => handleExampleClick(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Filters */}
          <SearchFiltersComponent
            viewMode={viewMode}
            filters={filters}
            updateFilter={updateFilter}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            expanded={filtersExpanded}
            setExpanded={setFiltersExpanded}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (
          <div className="no-results">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p className="no-results-title">No {viewMode} found</p>
            <p className="help-text">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div className="results-header-compact">
              <span className="results-count">
                <strong>{totalResults.toLocaleString()}</strong> {viewMode}
              </span>
              {totalPages > 1 && (
                <span className="page-info">Page {page} of {totalPages}</span>
              )}
            </div>

            <div className="results">
              {viewMode === 'signs' && (
                <div className="signs-grid">
                  {results.map((sign: any) => (
                    <SignCard key={sign.id} sign={sign} />
                  ))}
                </div>
              )}

              {viewMode === 'blocks' && (
                <div className="blocks-list">
                  {results.map((block: any, index: number) => (
                    <BlockCard 
                      key={block.id} 
                      block={block} 
                      index={index} 
                      onClick={handleBlockClick} 
                    />
                  ))}
                </div>
              )}

              {viewMode === 'graphemes' && (
                <div className="graphemes-list">
                  {results.map((grapheme: any, index: number) => (
                    <GraphemeCard 
                      key={grapheme.id} 
                      grapheme={grapheme} 
                      index={index} 
                      onClick={handleGraphemeClick} 
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(page - 1)} 
                  disabled={!hasPrevPage}
                  className="pagination-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Previous
                </button>
                
                <div className="pagination-pages">
                  {page > 2 && (
                    <>
                      <button onClick={() => setPage(1)} className="pagination-page">1</button>
                      {page > 3 && <span className="pagination-ellipsis">...</span>}
                    </>
                  )}
                  
                  {hasPrevPage && (
                    <button onClick={() => setPage(page - 1)} className="pagination-page">
                      {page - 1}
                    </button>
                  )}
                  
                  <button className="pagination-page active">{page}</button>
                  
                  {hasNextPage && (
                    <button onClick={() => setPage(page + 1)} className="pagination-page">
                      {page + 1}
                    </button>
                  )}
                  
                  {page < totalPages - 1 && (
                    <>
                      {page < totalPages - 2 && <span className="pagination-ellipsis">...</span>}
                      <button onClick={() => setPage(totalPages)} className="pagination-page">
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={() => setPage(page + 1)} 
                  disabled={!hasNextPage}
                  className="pagination-btn"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedGraphemeId && (
        <GraphemeModal
          graphemeId={selectedGraphemeId}
          onClose={() => setSelectedGraphemeId(null)}
          onNext={selectedGraphemeIndex < results.length - 1 ? handleNextGrapheme : undefined}
          onPrev={selectedGraphemeIndex > 0 ? handlePrevGrapheme : undefined}
        />
      )}

      {selectedBlockId && (
        <BlockModal
          blockId={selectedBlockId}
          onClose={() => setSelectedBlockId(null)}
          onNext={selectedBlockIndex < results.length - 1 ? handleNextBlock : undefined}
          onPrev={selectedBlockIndex > 0 ? handlePrevBlock : undefined}
        />
      )}
    </div>
  );
}
