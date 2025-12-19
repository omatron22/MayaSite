// src/pages/search.tsx - COMPLETE REDESIGNED VERSION
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { GraphemeModal } from '../components/GraphemeModal';
import { BlockModal } from '../components/BlockModal';
import './search.css';

type ViewMode = 'signs' | 'blocks' | 'graphemes';

const EXAMPLES = ['001', 'T585', 'ba', 'jaguar', 'Palenque'];
const PAGE_SIZE = 48;
const DEBOUNCE_DELAY = 300;

// Icon components
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// Memoized Sign Card Component
const SignCard = memo(({ sign }: { sign: any }) => (
  <Link to={`/sign/${sign.id}`} className="sign-card">
    <div className="sign-image">
      {sign.primary_image_url ? (
        <img src={sign.primary_image_url} alt={sign.display_code} loading="lazy" />
      ) : (
        <div className="no-image">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
      )}
    </div>
    <div className="sign-info">
      <div className="sign-code">{sign.display_code}</div>
      {sign.thompson_code && <div className="thompson-code">T{sign.thompson_code}</div>}
      {sign.syllabic_value && <div className="phonetic">{sign.syllabic_value}</div>}
      {sign.english_translation && <div className="translation">"{sign.english_translation}"</div>}
      {sign.word_class && <div className="word-class">{sign.word_class}</div>}
      <div className="sign-counts">
        {sign.grapheme_count > 0 && <span className="count-badge uses">{sign.grapheme_count} uses</span>}
        {sign.roboflow_count > 0 && <span className="count-badge examples">{sign.roboflow_count} ML</span>}
      </div>
    </div>
  </Link>
));
SignCard.displayName = 'SignCard';

// Memoized Block Card Component
const BlockCard = memo(({ block, index, onClick }: { block: any; index: number; onClick: (id: number, idx: number) => void }) => {
  const handleClick = useCallback(() => onClick(block.id, index), [block.id, index, onClick]);
  
  return (
    <div className="block-card clickable" onClick={handleClick}>
      {block.block_img && (
        <div className="block-image">
          <img src={block.block_img} alt={block.block_id} loading="lazy" />
        </div>
      )}
      <div className="block-content">
        <div className="block-header">
          <span className="block-id">{block.block_id}</span>
          {block.artifact_code && <span className="block-site">{block.artifact_code}</span>}
          {block.site_name && <span className="block-region">{block.site_name}</span>}
          {block.event_calendar && (
            <span className="block-date">
              <CalendarIcon />
              {block.event_calendar}
            </span>
          )}
        </div>
        {block.block_maya1 && <div className="block-maya">{block.block_maya1}</div>}
        {block.block_english && <div className="block-english">"{block.block_english}"</div>}
      </div>
    </div>
  );
});
BlockCard.displayName = 'BlockCard';

// Memoized Grapheme Card Component
const GraphemeCard = memo(({ grapheme, index, onClick }: { grapheme: any; index: number; onClick: (id: number, idx: number) => void }) => {
  const handleClick = useCallback(() => onClick(grapheme.id, index), [grapheme.id, index, onClick]);
  
  return (
    <div className="grapheme-card clickable" onClick={handleClick}>
      {grapheme.block_img && (
        <div className="grapheme-image">
          <img src={grapheme.block_img} alt="Block" loading="lazy" />
        </div>
      )}
      <div className="grapheme-content">
        <div className="grapheme-header">
          <span className="grapheme-sign">{grapheme.mhd_code_sub || grapheme.grapheme_code}</span>
          {grapheme.syllabic_value && <span className="grapheme-phonetic">{grapheme.syllabic_value}</span>}
        </div>
        {grapheme.block_maya1 && <div className="grapheme-maya">{grapheme.block_maya1}</div>}
        {grapheme.block_english && <div className="grapheme-english">"{grapheme.block_english}"</div>}
        <div className="grapheme-meta">
          {grapheme.artifact_code && <span>{grapheme.artifact_code}</span>}
          {grapheme.site_name && <span>{grapheme.site_name}</span>}
          {grapheme.event_calendar && <span>{grapheme.event_calendar}</span>}
        </div>
      </div>
    </div>
  );
});
GraphemeCard.displayName = 'GraphemeCard';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('signs');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Filter states
  const [hasImage, setHasImage] = useState(false);
  const [hasRoboflow, setHasRoboflow] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [hasTranslation, setHasTranslation] = useState(false);
  const [volume, setVolume] = useState<string>('all');
  const [wordClass, setWordClass] = useState<string>('all');
  const [technique, setTechnique] = useState<string>('all');
  const [artifactFilter, setArtifactFilter] = useState<string>('');
  const [region, setRegion] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('');

  // Modal states
  const [selectedGraphemeId, setSelectedGraphemeId] = useState<number | null>(null);
  const [selectedGraphemeIndex, setSelectedGraphemeIndex] = useState<number>(-1);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(-1);

  // Debounce ref
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoized computed values
  const totalPages = useMemo(() => Math.ceil(totalResults / PAGE_SIZE), [totalResults]);
  const hasNextPage = useMemo(() => (page - 1) * PAGE_SIZE + PAGE_SIZE < totalResults, [page, totalResults]);
  const hasPrevPage = useMemo(() => page > 1, [page]);

  const activeFilterCount = useMemo(() => 
    [
      viewMode === 'signs' && hasImage,
      viewMode === 'signs' && hasRoboflow,
      viewMode === 'signs' && hasTranslation,
      viewMode === 'graphemes' && hasImage,
      (viewMode === 'blocks' || viewMode === 'graphemes') && hasDate,
      volume !== 'all',
      wordClass !== 'all',
      technique !== 'all',
      artifactFilter.trim(),
      region !== 'all',
      siteFilter.trim()
    ].filter(Boolean).length,
    [viewMode, hasImage, hasRoboflow, hasDate, hasTranslation, volume, wordClass, technique, artifactFilter, region, siteFilter]
  );

  // Debounced search query effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(query);
      debounceTimeout.current = null;
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  // Search effect
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, page, debouncedQuery, hasImage, hasRoboflow, hasDate, hasTranslation, volume, wordClass, technique, artifactFilter, region, siteFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, viewMode, hasImage, hasRoboflow, hasDate, hasTranslation, volume, wordClass, technique, artifactFilter, region, siteFilter]);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'signs') {
        await searchSigns();
      } else if (viewMode === 'blocks') {
        await searchBlocks();
      } else {
        await searchGraphemes();
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, debouncedQuery, page, hasImage, hasRoboflow, hasDate, hasTranslation, volume, wordClass, technique, artifactFilter, region, siteFilter]);

  const searchSigns = useCallback(async () => {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (debouncedQuery.trim()) {
      whereConditions.push(`(
        graphcode LIKE ? OR 
        mhd_code LIKE ? OR 
        thompson_code LIKE ? OR 
        syllabic_value LIKE ? OR 
        english_translation LIKE ? OR
        logographic_value LIKE ?
      )`);
      const qParam = `%${debouncedQuery}%`;
      params.push(qParam, qParam, qParam, qParam, qParam, qParam);
    }

    if (volume !== 'all') {
      whereConditions.push('volume = ?');
      params.push(volume);
    }

    if (wordClass !== 'all') {
      whereConditions.push('word_class = ?');
      params.push(wordClass);
    }

    if (technique !== 'all') {
      whereConditions.push('technique = ?');
      params.push(technique);
    }

    if (hasImage) {
      whereConditions.push("primary_image_url IS NOT NULL AND primary_image_url != ''");
    }

    if (hasRoboflow) {
      whereConditions.push('(SELECT COUNT(*) FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id) > 0');
    }

    if (hasTranslation) {
      whereConditions.push("english_translation IS NOT NULL AND english_translation != ''");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM catalog_signs cs ${whereClause}`,
      args: params
    });
    const total = Number(countResult.rows[0].count);
    setTotalResults(total);

    const offset = (page - 1) * PAGE_SIZE;
    const signsResult = await db.execute({
      sql: `
        SELECT 
          cs.*,
          cs.graphcode as display_code,
          (SELECT COUNT(*) FROM graphemes g WHERE g.catalog_sign_id = cs.id) as grapheme_count,
          (SELECT COUNT(*) FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id) as roboflow_count
        FROM catalog_signs cs
        ${whereClause}
        ORDER BY cs.graphcode, cs.id
        LIMIT ? OFFSET ?
      `,
      args: [...params, PAGE_SIZE, offset]
    });

    setResults(signsResult.rows);
  }, [debouncedQuery, page, hasImage, hasRoboflow, hasTranslation, volume, wordClass, technique]);

  const searchBlocks = useCallback(async () => {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (debouncedQuery.trim()) {
      whereConditions.push(`(
        mhd_block_id LIKE ? OR
        artifact_code LIKE ? OR
        block_english LIKE ? OR
        block_maya1 LIKE ? OR
        event_calendar LIKE ?
      )`);
      const qParam = `%${debouncedQuery}%`;
      params.push(qParam, qParam, qParam, qParam, qParam);
    }

    if (region !== 'all') {
      whereConditions.push('region = ?');
      params.push(region);
    }

    if (artifactFilter.trim()) {
      whereConditions.push('artifact_code LIKE ?');
      params.push(`%${artifactFilter}%`);
    }

    if (siteFilter.trim()) {
      whereConditions.push('site_name LIKE ?');
      params.push(`%${siteFilter}%`);
    }

    if (hasDate) {
      whereConditions.push("event_calendar IS NOT NULL AND event_calendar != ''");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM blocks ${whereClause}`,
      args: params
    });
    const total = Number(countResult.rows[0].count);
    setTotalResults(total);

    const offset = (page - 1) * PAGE_SIZE;
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
      args: [...params, PAGE_SIZE, offset]
    });

    setResults(blocksResult.rows);
  }, [debouncedQuery, page, hasDate, region, artifactFilter, siteFilter]);

  const searchGraphemes = useCallback(async () => {
    const whereConditions: string[] = [];
    const params: any[] = [];

    if (debouncedQuery.trim()) {
      whereConditions.push(`(
        g.grapheme_code LIKE ? OR
        g.artifact_code LIKE ? OR
        b.block_english LIKE ? OR
        b.block_maya1 LIKE ?
      )`);
      const qParam = `%${debouncedQuery}%`;
      params.push(qParam, qParam, qParam, qParam);
    }

    if (region !== 'all') {
      whereConditions.push('b.region = ?');
      params.push(region);
    }

    if (artifactFilter.trim()) {
      whereConditions.push('g.artifact_code LIKE ?');
      params.push(`%${artifactFilter}%`);
    }

    if (siteFilter.trim()) {
      whereConditions.push('b.site_name LIKE ?');
      params.push(`%${siteFilter}%`);
    }

    if (hasImage) {
      whereConditions.push("cs.primary_image_url IS NOT NULL AND cs.primary_image_url != ''");
    }

    if (hasDate) {
      whereConditions.push("b.event_calendar IS NOT NULL AND b.event_calendar != ''");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

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
    const total = Number(countResult.rows[0].count);
    setTotalResults(total);

    const offset = (page - 1) * PAGE_SIZE;
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
      args: [...params, PAGE_SIZE, offset]
    });

    setResults(graphemesResult.rows);
  }, [debouncedQuery, page, hasImage, hasDate, region, artifactFilter, siteFilter]);

  // Memoized callbacks
  const clearFilters = useCallback(() => {
    setHasImage(false);
    setHasRoboflow(false);
    setHasDate(false);
    setHasTranslation(false);
    setVolume('all');
    setWordClass('all');
    setTechnique('all');
    setArtifactFilter('');
    setRegion('all');
    setSiteFilter('');
  }, []);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && debouncedQuery === query) {
      search();
    }
  }, [debouncedQuery, query, search]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleGraphemeClick = useCallback((graphemeId: number, index: number) => {
    setSelectedGraphemeId(graphemeId);
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

  const handleBlockClick = useCallback((blockId: number, index: number) => {
    setSelectedBlockId(blockId);
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

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div className="search-page">
      <div className="search-container">
        {/* Compact Hero Section */}
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

        {/* Compact Search Section */}
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
                onKeyDown={handleKeyDown}
              />
            </div>
            
            {/* View Mode Toggle inline */}
            <div className="view-mode-toggle-compact">
              <button 
                className={viewMode === 'signs' ? 'active' : ''} 
                onClick={() => handleViewModeChange('signs')}
              >
                Signs
              </button>
              <button 
                className={viewMode === 'blocks' ? 'active' : ''} 
                onClick={() => handleViewModeChange('blocks')}
              >
                Blocks
              </button>
              <button 
                className={viewMode === 'graphemes' ? 'active' : ''} 
                onClick={() => handleViewModeChange('graphemes')}
              >
                Graphemes
              </button>
            </div>
          </div>

          {/* Examples row */}
          <div className="search-examples-compact">
            {EXAMPLES.map(ex => (
              <button key={ex} className="example-btn-compact" onClick={() => handleExampleClick(ex)}>
                {ex}
              </button>
            ))}
          </div>

          {/* Compact Filters Section */}
          <div className="filters-compact">
            <button 
              className="filters-toggle-compact" 
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <FilterIcon />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge">{activeFilterCount}</span>
              )}
              <ChevronDownIcon />
            </button>

            {filtersExpanded && (
              <div className="filters-dropdown">
                {activeFilterCount > 0 && (
                  <button className="clear-btn" onClick={clearFilters}>
                    <XIcon /> Clear
                  </button>
                )}

                {/* Signs filters */}
                {viewMode === 'signs' && (
                  <div className="filter-grid-compact">
                    <div className="filter-row">
                      <button 
                        className={`filter-chip ${hasImage ? 'active' : ''}`}
                        onClick={() => setHasImage(!hasImage)}
                      >
                        <ImageIcon /> Image
                      </button>
                      <button 
                        className={`filter-chip ${hasRoboflow ? 'active' : ''}`}
                        onClick={() => setHasRoboflow(!hasRoboflow)}
                      >
                        ML Data
                      </button>
                      <button 
                        className={`filter-chip ${hasTranslation ? 'active' : ''}`}
                        onClick={() => setHasTranslation(!hasTranslation)}
                      >
                        Has Translation
                      </button>
                    </div>

                    <div className="filter-row">
                      <select className="filter-select-compact" value={volume} onChange={(e) => setVolume(e.target.value)}>
                        <option value="all">Time Period</option>
                        <option value="Classic">Classic</option>
                        <option value="Codices">Codices</option>
                      </select>

                      <select className="filter-select-compact" value={wordClass} onChange={(e) => setWordClass(e.target.value)}>
                        <option value="all">Word Class</option>
                        <option value="noun">Noun</option>
                        <option value="verb">Verb</option>
                        <option value="transitive verb">Transitive Verb</option>
                        <option value="intransitive verb">Intransitive Verb</option>
                        <option value="adjective">Adjective</option>
                        <option value="adverb">Adverb</option>
                        <option value="preposition">Preposition</option>
                        <option value="conjunction">Conjunction</option>
                        <option value="pronoun">Pronoun</option>
                        <option value="particle">Particle</option>
                        <option value="numeral">Numeral</option>
                        <option value="classifier">Classifier</option>
                        <option value="positional">Positional</option>
                        <option value="existential">Existential</option>
                        <option value="interjection">Interjection</option>
                      </select>

                      <select className="filter-select-compact" value={technique} onChange={(e) => setTechnique(e.target.value)}>
                        <option value="all">Technique</option>
                        <option value="carved">Carved</option>
                        <option value="painted">Painted</option>
                        <option value="codical">Codical</option>
                        <option value="molded">Molded</option>
                        <option value="incised">Incised</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Blocks filters */}
                {viewMode === 'blocks' && (
                  <div className="filter-grid-compact">
                    <div className="filter-row">
                      <button 
                        className={`filter-chip ${hasDate ? 'active' : ''}`}
                        onClick={() => setHasDate(!hasDate)}
                      >
                        <CalendarIcon /> Has Date
                      </button>
                    </div>

                    <div className="filter-row">
                      <select className="filter-select-compact" value={region} onChange={(e) => setRegion(e.target.value)}>
                        <option value="all">Region</option>
                        <option value="North">North (Yucatan)</option>
                        <option value="East">East</option>
                        <option value="Central">Central (Peten)</option>
                        <option value="Usmacinta">Usmacinta</option>
                        <option value="South">South</option>
                        <option value="West">West</option>
                      </select>

                      <input
                        type="text"
                        className="filter-input-compact"
                        placeholder="Artifact (e.g., PAL)"
                        value={artifactFilter}
                        onChange={(e) => setArtifactFilter(e.target.value)}
                      />

                      <input
                        type="text"
                        className="filter-input-compact"
                        placeholder="Site (e.g., Palenque)"
                        value={siteFilter}
                        onChange={(e) => setSiteFilter(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Graphemes filters */}
                {viewMode === 'graphemes' && (
                  <div className="filter-grid-compact">
                    <div className="filter-row">
                      <button 
                        className={`filter-chip ${hasImage ? 'active' : ''}`}
                        onClick={() => setHasImage(!hasImage)}
                      >
                        <ImageIcon /> Image
                      </button>
                      <button 
                        className={`filter-chip ${hasDate ? 'active' : ''}`}
                        onClick={() => setHasDate(!hasDate)}
                      >
                        <CalendarIcon /> Date
                      </button>
                    </div>

                    <div className="filter-row">
                      <select className="filter-select-compact" value={region} onChange={(e) => setRegion(e.target.value)}>
                        <option value="all">Region</option>
                        <option value="North">North (Yucatan)</option>
                        <option value="East">East</option>
                        <option value="Central">Central (Peten)</option>
                        <option value="Usmacinta">Usmacinta</option>
                        <option value="South">South</option>
                        <option value="West">West</option>
                      </select>

                      <input
                        type="text"
                        className="filter-input-compact"
                        placeholder="Artifact (e.g., PAL)"
                        value={artifactFilter}
                        onChange={(e) => setArtifactFilter(e.target.value)}
                      />

                      <input
                        type="text"
                        className="filter-input-compact"
                        placeholder="Site (e.g., Palenque)"
                        value={siteFilter}
                        onChange={(e) => setSiteFilter(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
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
                    <BlockCard key={block.id} block={block} index={index} onClick={handleBlockClick} />
                  ))}
                </div>
              )}

              {viewMode === 'graphemes' && (
                <div className="graphemes-list">
                  {results.map((grapheme: any, index: number) => (
                    <GraphemeCard key={grapheme.id} grapheme={grapheme} index={index} onClick={handleGraphemeClick} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => goToPage(page - 1)} 
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
                      <button onClick={() => goToPage(1)} className="pagination-page">1</button>
                      {page > 3 && <span className="pagination-ellipsis">...</span>}
                    </>
                  )}
                  
                  {hasPrevPage && (
                    <button onClick={() => goToPage(page - 1)} className="pagination-page">{page - 1}</button>
                  )}
                  
                  <button className="pagination-page active">{page}</button>
                  
                  {hasNextPage && (
                    <button onClick={() => goToPage(page + 1)} className="pagination-page">{page + 1}</button>
                  )}
                  
                  {page < totalPages - 1 && (
                    <>
                      {page < totalPages - 2 && <span className="pagination-ellipsis">...</span>}
                      <button onClick={() => goToPage(totalPages)} className="pagination-page">{totalPages}</button>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={() => goToPage(page + 1)} 
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
