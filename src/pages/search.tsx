// src/pages/search.tsx - COMPLETE CLEAN VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { GraphemeModal } from '../components/GraphemeModal';
import { BlockModal } from '../components/BlockModal';
import { SignCard } from '../components/search/SignCard';
import { BlockCard } from '../components/search/BlockCard';
import { GraphemeCard } from '../components/search/GraphemeCard';
import { SearchFiltersComponent } from '../components/search/SearchFilters';
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus search on '/'
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Navigation shortcuts when modal is open
      if (selectedGraphemeId || selectedBlockId) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (selectedGraphemeId) handlePrevGrapheme();
          if (selectedBlockId) handlePrevBlock();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (selectedGraphemeId) handleNextGrapheme();
          if (selectedBlockId) handleNextBlock();
        }
        if (e.key === 'Escape') {
          setSelectedGraphemeId(null);
          setSelectedBlockId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedGraphemeId, selectedBlockId, selectedGraphemeIndex, selectedBlockIndex, results]);

  // Handlers
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
    searchInputRef.current?.focus();
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
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
        {/* Cleaner Hero */}
        <div className="hero-compact">
          <h1>Maya Hieroglyphic Database</h1>
          <p className="hero-subtitle">Search and explore 3,141 signs across 208,000 blocks</p>
        </div>

        {/* Search Bar */}
        <div className="search-compact">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search by code, syllabic value, translation, or artifact..."
              value={query}
              onChange={handleQueryChange}
            />
            {query && (
              <button 
                className="clear-search-btn"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            <kbd className="search-kbd">/</kbd>
          </div>

          {/* Examples */}
          <div className="search-examples-compact">
            <span className="examples-label">Try:</span>
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

          {/* Filters with View Mode Inside */}
          <SearchFiltersComponent
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
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
            <p>Searching database...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">
              <Search size={48} />
            </div>
            <p className="no-results-title">No {viewMode} found</p>
            <p className="help-text">
              {query || activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : 'Enter a search term or select filters to get started'}
            </p>
            {(query || activeFilterCount > 0) && (
              <button 
                className="clear-all-btn"
                onClick={() => {
                  setQuery('');
                  clearFilters();
                }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div className="results-header-compact">
              <div className="results-count">
                <strong>{totalResults.toLocaleString()}</strong> {viewMode}
                {(query || activeFilterCount > 0) && (
                  <span className="results-meta">
                    {query && <span> matching "{query}"</span>}
                    {activeFilterCount > 0 && <span> with {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>}
                  </span>
                )}
              </div>
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
                  <ChevronLeft size={16} />
                  <span>Previous</span>
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
                  <span>Next</span>
                  <ChevronRight size={16} />
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
