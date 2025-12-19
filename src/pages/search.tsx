import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import './search.css';

type ViewMode = 'signs' | 'blocks' | 'graphemes';

export function SearchPage() {
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats] = useState({ total: 3141, blocks: 208000, instances: 10665 });
  
  // View mode and filters
  const [viewMode, setViewMode] = useState<ViewMode>('signs');
  const [filters, setFilters] = useState({
    hasImage: false,
    hasRoboflow: false,
    location: '',
    dateFrom: '',
    dateTo: '',
  });
  const [locations, setLocations] = useState<string[]>([]);

  // Load available locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  // Auto-load when view mode changes
  useEffect(() => {
    loadBrowseData();
  }, [viewMode, filters]);

  async function loadLocations() {
    try {
      const result = await db.execute({
        sql: `SELECT DISTINCT site_origin FROM blocks WHERE site_origin IS NOT NULL ORDER BY site_origin LIMIT 100`,
        args: []
      });
      setLocations(result.rows.map((r: any) => r.site_origin));
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  }

  async function loadBrowseData() {
    // If there's a search query, use search instead
    if (query.trim()) {
      handleSearch(query);
      return;
    }

    setLoading(true);
    try {
      if (viewMode === 'signs') {
        await browseSigns();
      } else if (viewMode === 'blocks') {
        await browseBlocks();
      } else {
        await browseGraphemes();
      }
    } catch (error) {
      console.error('Failed to load browse data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function browseSigns() {
    const imageFilter = filters.hasImage ? 'AND cs.primary_image_url IS NOT NULL' : '';
    const roboflowFilter = filters.hasRoboflow 
      ? 'AND EXISTS (SELECT 1 FROM roboflow_instances WHERE catalog_sign_id = cs.id)' 
      : '';

    const result = await db.execute({
      sql: `
        SELECT 
          cs.id, 
          cs.mhd_code, 
          cs.phonetic_value, 
          cs.variant_code, 
          cs.primary_image_url,
          cs.syllabic_value, 
          cs.english_translation,
          cs.thompson_code,
          COUNT(DISTINCT ri.id) as roboflow_count,
          COUNT(DISTINCT g.id) as grapheme_count
        FROM catalog_signs cs
        LEFT JOIN roboflow_instances ri ON ri.catalog_sign_id = cs.id
        LEFT JOIN graphemes g ON g.catalog_sign_id = cs.id
        WHERE 1=1
        ${imageFilter}
        ${roboflowFilter}
        GROUP BY cs.id
        ORDER BY 
          (SELECT COUNT(*) FROM roboflow_instances WHERE catalog_sign_id = cs.id) DESC,
          CAST(cs.mhd_code AS INTEGER)
        LIMIT 48
      `,
      args: []
    });
    
    setResults(result.rows as any);
  }

  async function browseBlocks() {
    const imageFilter = filters.hasImage ? 'AND b.image_url IS NOT NULL' : '';
    const locationFilter = filters.location ? 'AND b.site_origin = ?' : '';
    const dateFromFilter = filters.dateFrom ? 'AND CAST(b.event_calendar AS INTEGER) >= ?' : '';
    const dateToFilter = filters.dateTo ? 'AND CAST(b.event_calendar AS INTEGER) <= ?' : '';

    const args: any[] = [];
    if (filters.location) args.push(filters.location);
    if (filters.dateFrom) args.push(parseInt(filters.dateFrom));
    if (filters.dateTo) args.push(parseInt(filters.dateTo));

    const result = await db.execute({
      sql: `
        SELECT 
          b.id,
          b.block_id,
          b.image_url,
          b.block_english,
          b.block_maya1,
          b.site_origin,
          b.event_calendar,
          b.location_summary,
          COUNT(g.id) as grapheme_count
        FROM blocks b
        LEFT JOIN graphemes g ON g.block_id = b.id
        WHERE 1=1
        ${imageFilter}
        ${locationFilter}
        ${dateFromFilter}
        ${dateToFilter}
        GROUP BY b.id
        ORDER BY b.image_url IS NOT NULL DESC, b.event_calendar DESC
        LIMIT 48
      `,
      args
    });
    
    setResults(result.rows as any);
  }

  async function browseGraphemes() {
    const locationFilter = filters.location ? 'AND b.site_origin = ?' : '';
    const dateFromFilter = filters.dateFrom ? 'AND CAST(b.event_calendar AS INTEGER) >= ?' : '';
    const dateToFilter = filters.dateTo ? 'AND CAST(b.event_calendar AS INTEGER) <= ?' : '';

    const args: any[] = [];
    if (filters.location) args.push(filters.location);
    if (filters.dateFrom) args.push(parseInt(filters.dateFrom));
    if (filters.dateTo) args.push(parseInt(filters.dateTo));

    const result = await db.execute({
      sql: `
        SELECT 
          g.id,
          g.grapheme_code,
          g.location_summary,
          g.artifact_code,
          b.block_english,
          b.block_maya1,
          b.event_calendar,
          b.site_origin,
          b.image_url as block_image_url,
          cs.mhd_code,
          cs.phonetic_value
        FROM graphemes g
        LEFT JOIN blocks b ON g.block_id = b.id
        LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
        WHERE 1=1
        ${locationFilter}
        ${dateFromFilter}
        ${dateToFilter}
        ORDER BY b.image_url IS NOT NULL DESC, b.event_calendar DESC
        LIMIT 48
      `,
      args
    });
    
    setResults(result.rows as any);
  }

  async function handleSearch(searchQuery: string) {
    if (searchQuery.trim().length < 1) {
      loadBrowseData();
      return;
    }

    setLoading(true);
    
    try {
      if (viewMode === 'signs') {
        await searchSigns(searchQuery);
      } else if (viewMode === 'blocks') {
        await searchBlocks(searchQuery);
      } else {
        await searchGraphemes(searchQuery);
      }
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setLoading(false);
    }
  }

  async function searchSigns(searchQuery: string) {
    const imageFilter = filters.hasImage ? 'AND cs.primary_image_url IS NOT NULL' : '';
    const roboflowFilter = filters.hasRoboflow 
      ? 'AND EXISTS (SELECT 1 FROM roboflow_instances WHERE catalog_sign_id = cs.id)' 
      : '';

    const result = await db.execute({
      sql: `
        SELECT 
          cs.id, 
          cs.mhd_code, 
          cs.phonetic_value, 
          cs.variant_code, 
          cs.primary_image_url,
          cs.syllabic_value, 
          cs.english_translation,
          cs.thompson_code,
          COUNT(DISTINCT ri.id) as roboflow_count,
          COUNT(DISTINCT g.id) as grapheme_count
        FROM catalog_signs cs
        LEFT JOIN roboflow_instances ri ON ri.catalog_sign_id = cs.id
        LEFT JOIN graphemes g ON g.catalog_sign_id = cs.id
        WHERE (
          cs.mhd_code LIKE ? 
          OR cs.thompson_code LIKE ?
          OR cs.syllabic_value LIKE ? 
          OR cs.english_translation LIKE ?
          OR cs.phonetic_value LIKE ?
        )
        ${imageFilter}
        ${roboflowFilter}
        GROUP BY cs.id
        ORDER BY 
          CASE 
            WHEN cs.mhd_code = ? THEN 1
            WHEN cs.mhd_code LIKE ? THEN 2
            ELSE 3
          END,
          CAST(COALESCE(cs.base_thompson_number, cs.mhd_code) AS INTEGER)
        LIMIT 100
      `,
      args: [
        `%${searchQuery}%`, 
        `%${searchQuery}%`, 
        `%${searchQuery}%`, 
        `%${searchQuery}%`,
        `%${searchQuery}%`,
        searchQuery,
        `${searchQuery}%`
      ]
    });
    
    setResults(result.rows as any);
  }

  async function searchBlocks(searchQuery: string) {
    const imageFilter = filters.hasImage ? 'AND b.image_url IS NOT NULL' : '';
    const locationFilter = filters.location ? 'AND b.site_origin = ?' : '';
    const dateFromFilter = filters.dateFrom ? 'AND CAST(b.event_calendar AS INTEGER) >= ?' : '';
    const dateToFilter = filters.dateTo ? 'AND CAST(b.event_calendar AS INTEGER) <= ?' : '';

    const args: any[] = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    if (filters.location) args.push(filters.location);
    if (filters.dateFrom) args.push(parseInt(filters.dateFrom));
    if (filters.dateTo) args.push(parseInt(filters.dateTo));

    const result = await db.execute({
      sql: `
        SELECT 
          b.id,
          b.block_id,
          b.image_url,
          b.block_english,
          b.block_maya1,
          b.site_origin,
          b.event_calendar,
          b.location_summary,
          COUNT(g.id) as grapheme_count
        FROM blocks b
        LEFT JOIN graphemes g ON g.block_id = b.id
        WHERE (
          b.block_english LIKE ?
          OR b.block_maya1 LIKE ?
          OR b.site_origin LIKE ?
        )
        ${imageFilter}
        ${locationFilter}
        ${dateFromFilter}
        ${dateToFilter}
        GROUP BY b.id
        ORDER BY b.event_calendar DESC
        LIMIT 100
      `,
      args
    });
    
    setResults(result.rows as any);
  }

  async function searchGraphemes(searchQuery: string) {
    const locationFilter = filters.location ? 'AND b.site_origin = ?' : '';
    const dateFromFilter = filters.dateFrom ? 'AND CAST(b.event_calendar AS INTEGER) >= ?' : '';
    const dateToFilter = filters.dateTo ? 'AND CAST(b.event_calendar AS INTEGER) <= ?' : '';

    const args: any[] = [`%${searchQuery}%`, `%${searchQuery}%`];
    if (filters.location) args.push(filters.location);
    if (filters.dateFrom) args.push(parseInt(filters.dateFrom));
    if (filters.dateTo) args.push(parseInt(filters.dateTo));

    const result = await db.execute({
      sql: `
        SELECT 
          g.id,
          g.grapheme_code,
          g.location_summary,
          g.artifact_code,
          b.block_english,
          b.block_maya1,
          b.event_calendar,
          b.site_origin,
          b.image_url as block_image_url,
          cs.mhd_code,
          cs.phonetic_value
        FROM graphemes g
        LEFT JOIN blocks b ON g.block_id = b.id
        LEFT JOIN catalog_signs cs ON g.catalog_sign_id = cs.id
        WHERE (
          cs.mhd_code LIKE ?
          OR cs.phonetic_value LIKE ?
        )
        ${locationFilter}
        ${dateFromFilter}
        ${dateToFilter}
        ORDER BY b.event_calendar DESC
        LIMIT 100
      `,
      args
    });
    
    setResults(result.rows as any);
  }

  return (
    <div className="search-page">
      <div className="search-container">
        
        {/* Hero Section */}
        <div className="hero">
          <h1>Maya Hieroglyphic Database</h1>
          <p className="subtitle">
            Unified search interface for Classic Maya glyphic inscriptions
          </p>
          
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.total.toLocaleString()}</div>
              <div className="stat-label">Catalog Signs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.blocks.toLocaleString()}</div>
              <div className="stat-label">Glyph Blocks</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.instances.toLocaleString()}</div>
              <div className="stat-label">Annotated Instances</div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="search-wrapper">
            <input
              type="text"
              placeholder={
                viewMode === 'signs' 
                  ? "Search by MHD code (e.g., 1, 585), Thompson (T1), phonetic (yu, ba), or meaning (lord, sky)..."
                  : viewMode === 'blocks'
                  ? "Search blocks by translation, Maya text, or site..."
                  : "Search graphemes by sign code or phonetic value..."
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="search-input"
            />
            
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
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

            {/* Filters */}
            <div className="filters">
              {viewMode === 'signs' && (
                <>
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.hasImage}
                      onChange={(e) => setFilters({...filters, hasImage: e.target.checked})}
                    />
                    <span>Has Image</span>
                  </label>
                  
                  <label className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.hasRoboflow}
                      onChange={(e) => setFilters({...filters, hasRoboflow: e.target.checked})}
                    />
                    <span>Has Roboflow Data</span>
                  </label>
                </>
              )}

              {(viewMode === 'blocks' || viewMode === 'graphemes') && (
                <>
                  {viewMode === 'blocks' && (
                    <label className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.hasImage}
                        onChange={(e) => setFilters({...filters, hasImage: e.target.checked})}
                      />
                      <span>Has Image</span>
                    </label>
                  )}

                  <select 
                    className="filter-select"
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                  >
                    <option value="">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="From Year"
                    className="filter-input"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  />

                  <input
                    type="number"
                    placeholder="To Year"
                    className="filter-input"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="no-results">
            <p>No {viewMode} found matching your criteria</p>
            <p className="help-text">Try adjusting your search or filters</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="results">
            <p className="results-count">
              Showing {results.length} {viewMode === 'signs' ? 'sign' : viewMode.slice(0, -1)}
              {results.length !== 1 ? 's' : ''}
            </p>
            
            {/* Signs Grid */}
            {viewMode === 'signs' && (
              <div className="signs-grid">
                {results.map((sign: any) => (
                  <Link key={sign.id} to={`/sign/${sign.id}`} className="sign-card">
                    <div className="sign-image">
                      {sign.primary_image_url ? (
                        <img src={sign.primary_image_url} alt={sign.mhd_code} />
                      ) : (
                        <div className="no-image">?</div>
                      )}
                    </div>
                    <div className="sign-code">{sign.mhd_code}</div>
                    {sign.thompson_code && <div className="thompson-code">T{sign.thompson_code}</div>}
                    {sign.phonetic_value && <div className="phonetic">{sign.phonetic_value}</div>}
                    {sign.english_translation && <div className="translation">"{sign.english_translation}"</div>}
                    <div className="sign-counts">
                      {sign.grapheme_count > 0 && <span className="count-badge uses">{sign.grapheme_count} uses</span>}
                      {sign.roboflow_count > 0 && <span className="count-badge examples">{sign.roboflow_count} examples</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Blocks List */}
            {viewMode === 'blocks' && (
              <div className="blocks-list">
                {results.map((block: any) => (
                  <div key={block.id} className="block-card">
                    {block.image_url && (
                      <div className="block-image">
                        <img src={block.image_url} alt={block.block_id} />
                      </div>
                    )}
                    <div className="block-content">
                      <div className="block-header">
                        <span className="block-id">{block.block_id}</span>
                        {block.site_origin && <span className="block-site">{block.site_origin}</span>}
                        {block.event_calendar && <span className="block-date">{block.event_calendar}</span>}
                      </div>
                      {block.block_maya1 && <div className="block-maya">{block.block_maya1}</div>}
                      {block.block_english && <div className="block-english">"{block.block_english}"</div>}
                      {block.grapheme_count > 0 && (
                        <div className="block-meta">{block.grapheme_count} graphemes</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Graphemes List */}
            {viewMode === 'graphemes' && (
              <div className="graphemes-list">
                {results.map((grapheme: any) => (
                  <div key={grapheme.id} className="grapheme-card">
                    {grapheme.block_image_url && (
                      <div className="grapheme-image">
                        <img src={grapheme.block_image_url} alt="Block" />
                      </div>
                    )}
                    <div className="grapheme-content">
                      <div className="grapheme-header">
                        <span className="grapheme-sign">{grapheme.mhd_code}</span>
                        {grapheme.phonetic_value && <span className="grapheme-phonetic">{grapheme.phonetic_value}</span>}
                        {grapheme.artifact_code && <span className="grapheme-artifact">{grapheme.artifact_code}</span>}
                      </div>
                      {grapheme.block_maya1 && <div className="grapheme-maya">{grapheme.block_maya1}</div>}
                      {grapheme.block_english && <div className="grapheme-english">"{grapheme.block_english}"</div>}
                      <div className="grapheme-meta">
                        {grapheme.site_origin && <span>Site: {grapheme.site_origin}</span>}
                        {grapheme.event_calendar && <span>Date: {grapheme.event_calendar}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
