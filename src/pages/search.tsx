// src/pages/search.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import { GraphemeModal } from '../components/GraphemeModal';
import './search.css';
import { BlockModal } from '../components/BlockModal';

type ViewMode = 'signs' | 'blocks' | 'graphemes';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('signs');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  
  // Filter states
  const [hasImage, setHasImage] = useState(false);
  const [hasRoboflow, setHasRoboflow] = useState(false);
  const [hasDate, setHasDate] = useState(false);
  const [volume, setVolume] = useState<string>('all');
  const [wordClass, setWordClass] = useState<string>('all');
  const [technique, setTechnique] = useState<string>('all');
  const [artifactFilter, setArtifactFilter] = useState<string>('');

  // Modal state
  const [selectedGraphemeId, setSelectedGraphemeId] = useState<number | null>(null);
  const [selectedGraphemeIndex, setSelectedGraphemeIndex] = useState<number>(-1);

  // Modal state for blocks
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(-1);

  const pageSize = 48;
  const totalPages = Math.ceil(totalResults / pageSize);

  const examples = ['001', 'T585', 'ba', 'jaguar', 'Palenque'];

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, page, hasImage, hasRoboflow, hasDate, volume, wordClass, technique, artifactFilter]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, viewMode, hasImage, hasRoboflow, hasDate, volume, wordClass, technique, artifactFilter]);

  async function search() {
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
  }

  async function searchSigns() {
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (query.trim()) {
      whereConditions.push(`(
        graphcode LIKE ? OR 
        mhd_code LIKE ? OR 
        thompson_code LIKE ? OR 
        syllabic_value LIKE ? OR 
        english_translation LIKE ? OR
        logographic_value LIKE ?
      )`);
      const qParam = `%${query}%`;
      params.push(qParam, qParam, qParam, qParam, qParam, qParam);
    }

    if (hasImage) {
      whereConditions.push("primary_image_url IS NOT NULL AND primary_image_url != ''");
    }

    if (hasRoboflow) {
      whereConditions.push('(SELECT COUNT(*) FROM roboflow_instances r WHERE r.catalog_sign_id = cs.id) > 0');
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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM catalog_signs cs ${whereClause}`,
      args: params
    });
    const total = Number(countResult.rows[0].count);
    setTotalResults(total);

    const offset = (page - 1) * pageSize;
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
      args: [...params, pageSize, offset]
    });

    setResults(signsResult.rows);
    setHasNextPage(offset + pageSize < total);
    setHasPrevPage(page > 1);
  }

  async function searchBlocks() {
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (query.trim()) {
      whereConditions.push(`(
        mhd_block_id LIKE ? OR
        artifact_code LIKE ? OR
        block_english LIKE ? OR
        block_maya1 LIKE ? OR
        event_calendar LIKE ?
      )`);
      const qParam = `%${query}%`;
      params.push(qParam, qParam, qParam, qParam, qParam);
    }

    if (hasDate) {
      whereConditions.push("event_calendar IS NOT NULL AND event_calendar != ''");
    }

    if (artifactFilter.trim()) {
      whereConditions.push('artifact_code LIKE ?');
      params.push(`%${artifactFilter}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM blocks ${whereClause}`,
      args: params
    });
    const total = Number(countResult.rows[0].count);
    setTotalResults(total);

    const offset = (page - 1) * pageSize;
    const blocksResult = await db.execute({
      sql: `
        SELECT 
          id,
          mhd_block_id as block_id,
          artifact_code,
          block_maya1,
          block_english,
          event_calendar,
          block_image1_url as block_img
        FROM blocks
        ${whereClause}
        ORDER BY sort_order
        LIMIT ? OFFSET ?
      `,
      args: [...params, pageSize, offset]
    });

    setResults(blocksResult.rows);
    setHasNextPage(offset + pageSize < total);
    setHasPrevPage(page > 1);
  }

async function searchGraphemes() {
  let whereConditions: string[] = [];
  let params: any[] = [];

  if (query.trim()) {
    whereConditions.push(`(
      g.grapheme_code LIKE ? OR
      g.artifact_code LIKE ? OR
      b.block_english LIKE ? OR
      b.block_maya1 LIKE ?
    )`);
    const qParam = `%${query}%`;
    params.push(qParam, qParam, qParam, qParam);
  }

  if (hasImage) {
    whereConditions.push("cs.primary_image_url IS NOT NULL AND cs.primary_image_url != ''");
  }

  if (hasDate) {
    whereConditions.push("b.event_calendar IS NOT NULL AND b.event_calendar != ''");
  }

  if (artifactFilter.trim()) {
    whereConditions.push('g.artifact_code LIKE ?');
    params.push(`%${artifactFilter}%`);
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

  const offset = (page - 1) * pageSize;
  const graphemesResult = await db.execute({
    sql: `
      SELECT 
        g.*,
        b.block_maya1,
        b.block_english,
        b.event_calendar,
        b.block_image1_url as block_img,
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
    args: [...params, pageSize, offset]
  });

  setResults(graphemesResult.rows);
  setHasNextPage(offset + pageSize < total);
  setHasPrevPage(page > 1);
}


  function clearFilters() {
    setHasImage(false);
    setHasRoboflow(false);
    setHasDate(false);
    setVolume('all');
    setWordClass('all');
    setTechnique('all');
    setArtifactFilter('');
  }

  function handleGraphemeClick(graphemeId: number, index: number) {
    setSelectedGraphemeId(graphemeId);
    setSelectedGraphemeIndex(index);
  }

  function handleNextGrapheme() {
    if (selectedGraphemeIndex < results.length - 1) {
      const nextIndex = selectedGraphemeIndex + 1;
      setSelectedGraphemeId(results[nextIndex].id);
      setSelectedGraphemeIndex(nextIndex);
    }
  }

  function handlePrevGrapheme() {
    if (selectedGraphemeIndex > 0) {
      const prevIndex = selectedGraphemeIndex - 1;
      setSelectedGraphemeId(results[prevIndex].id);
      setSelectedGraphemeIndex(prevIndex);
    }
  }

  function handleBlockClick(blockId: number, index: number) {
  setSelectedBlockId(blockId);
  setSelectedBlockIndex(index);
}

function handleNextBlock() {
  if (selectedBlockIndex < results.length - 1) {
    const nextIndex = selectedBlockIndex + 1;
    setSelectedBlockId(results[nextIndex].id);
    setSelectedBlockIndex(nextIndex);
  }
}

function handlePrevBlock() {
  if (selectedBlockIndex > 0) {
    const prevIndex = selectedBlockIndex - 1;
    setSelectedBlockId(results[prevIndex].id);
    setSelectedBlockIndex(prevIndex);
  }
}


const activeFilterCount = [
  viewMode === 'signs' && hasImage,
  viewMode === 'signs' && hasRoboflow,
  viewMode === 'graphemes' && hasImage,
  (viewMode === 'blocks' || viewMode === 'graphemes') && hasDate,
  volume !== 'all',
  wordClass !== 'all',
  technique !== 'all',
  artifactFilter.trim()
].filter(Boolean).length;


  return (
    <div className="search-page">
      <div className="search-container">
        <div className="hero">
          <h1>Maya Hieroglyphic Database</h1>
          <p className="subtitle">Unified search interface for Classic Maya glyphic inscriptions</p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">3,141</div>
              <div className="stat-label">Catalog Signs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">208,000</div>
              <div className="stat-label">Glyph Blocks</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">10,665</div>
              <div className="stat-label">Annotated Instances</div>
            </div>
          </div>
        </div>

        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search by MHD code (001, 585), Thompson (T1, I), Zender, syllabic (yu, ba), word class"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />

          <div className="search-examples">
            Try:
            {examples.map(ex => (
              <button key={ex} className="example-btn" onClick={() => setQuery(ex)}>{ex}</button>
            ))}
          </div>

          <div className="view-mode-toggle">
            <button className={viewMode === 'signs' ? 'active' : ''} onClick={() => setViewMode('signs')}>Signs</button>
            <button className={viewMode === 'blocks' ? 'active' : ''} onClick={() => setViewMode('blocks')}>Blocks</button>
            <button className={viewMode === 'graphemes' ? 'active' : ''} onClick={() => setViewMode('graphemes')}>Graphemes</button>
          </div>

          <div className="filters-section">
            <div className="filters-header">
              <h3>Filters</h3>
              {activeFilterCount > 0 && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear all ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="filters-grid">
              {/* Toggle filters */}
              <div className="filter-group">
                <label className="filter-label">Quick Filters</label>
                <div className="filter-pills">
                  {viewMode === 'signs' && (
                    <>
                      <button 
                        className={`filter-pill ${hasImage ? 'active' : ''}`}
                        onClick={() => setHasImage(!hasImage)}
                      >
                        Has Image
                      </button>
                      <button 
                        className={`filter-pill ${hasRoboflow ? 'active' : ''}`}
                        onClick={() => setHasRoboflow(!hasRoboflow)}
                      >
                        Has Roboflow Data
                      </button>
                    </>
                  )}
{viewMode === 'blocks' && (
  <button 
    className={`filter-pill ${hasDate ? 'active' : ''}`}
    onClick={() => setHasDate(!hasDate)}
  >
    Has Date
  </button>
)}
{viewMode === 'graphemes' && (
  <>
    <button 
      className={`filter-pill ${hasImage ? 'active' : ''}`}
      onClick={() => setHasImage(!hasImage)}
    >
      Has Catalog Image
    </button>
    <button 
      className={`filter-pill ${hasDate ? 'active' : ''}`}
      onClick={() => setHasDate(!hasDate)}
    >
      Has Date
    </button>
  </>
)}

                </div>
              </div>

              {/* Signs-specific filters */}
              {viewMode === 'signs' && (
                <>
                  <div className="filter-group">
                    <label className="filter-label">Time Period</label>
                    <select className="filter-select" value={volume} onChange={(e) => setVolume(e.target.value)}>
                      <option value="all">All Periods</option>
                      <option value="Classic">Classic (250-900 CE)</option>
                      <option value="Codices">Codices (Post-Classic)</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Word Class</label>
                    <select className="filter-select" value={wordClass} onChange={(e) => setWordClass(e.target.value)}>
                      <option value="all">All Classes</option>
                      <option value="numeral">Numeral</option>
                      <option value="noun">Noun</option>
                      <option value="transitive verb">Transitive Verb</option>
                      <option value="intransitive verb">Intransitive Verb</option>
                      <option value="adjective">Adjective</option>
                      <option value="preposition">Preposition</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Technique</label>
                    <select className="filter-select" value={technique} onChange={(e) => setTechnique(e.target.value)}>
                      <option value="all">All Techniques</option>
                      <option value="carved">Carved</option>
                      <option value="painted">Painted</option>
                      <option value="codical">Codical</option>
                    </select>
                  </div>
                </>
              )}

              {/* Blocks/Graphemes-specific filters */}
              {(viewMode === 'blocks' || viewMode === 'graphemes') && (
                <div className="filter-group">
                  <label className="filter-label">Artifact Code</label>
                  <input
                    type="text"
                    className="filter-input-text"
                    placeholder="e.g., PAL, PNG, TIK"
                    value={artifactFilter}
                    onChange={(e) => setArtifactFilter(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="no-results">
            <p>No {viewMode} found</p>
            <p className="help-text">Try searching or check different filters</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="results-header">
              <p className="results-count">
                Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalResults)} of {totalResults.toLocaleString()} {viewMode}
              </p>
              {totalPages > 1 && (
                <div className="pagination-info">
                  Page {page} of {totalPages}
                </div>
              )}
            </div>

            <div className="results">
              {viewMode === 'signs' && (
                <div className="signs-grid">
                  {results.map((sign: any) => (
                    <Link key={sign.id} to={`/sign/${sign.id}`} className="sign-card">
                      <div className="sign-image">
                        {sign.primary_image_url ? <img src={sign.primary_image_url} alt={sign.display_code} /> : <div className="no-image">?</div>}
                      </div>
                      <div className="sign-code">{sign.display_code}</div>
                      {sign.thompson_code && <div className="thompson-code">T{sign.thompson_code}</div>}
                      {sign.syllabic_value && <div className="phonetic">{sign.syllabic_value}</div>}
                      {sign.english_translation && <div className="translation">"{sign.english_translation}"</div>}
                      {sign.word_class && <div className="word-class">{sign.word_class}</div>}
                      <div className="sign-counts">
                        {sign.grapheme_count > 0 && <span className="count-badge uses">{sign.grapheme_count} uses</span>}
                        {sign.roboflow_count > 0 && <span className="count-badge examples">{sign.roboflow_count} examples</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

{viewMode === 'blocks' && (
  <div className="blocks-list">
    {results.map((block: any, index: number) => (
      <div 
        key={block.id} 
        className="block-card clickable"
        onClick={() => handleBlockClick(block.id, index)}
      >

                      {block.block_img && <div className="block-image"><img src={block.block_img} alt={block.block_id} /></div>}
                      <div className="block-content">
                        <div className="block-header">
                          <span className="block-id">{block.block_id}</span>
                          {block.artifact_code && <span className="block-site">{block.artifact_code}</span>}
                          {block.event_calendar && <span className="block-date">{block.event_calendar}</span>}
                        </div>
                        {block.block_maya1 && <div className="block-maya">{block.block_maya1}</div>}
                        {block.block_english && <div className="block-english">"{block.block_english}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'graphemes' && (
                <div className="graphemes-list">
                  {results.map((grapheme: any, index: number) => (
                    <div 
                      key={grapheme.id} 
                      className="grapheme-card clickable"
                      onClick={() => handleGraphemeClick(grapheme.id, index)}
                    >
                      {grapheme.block_img && <div className="grapheme-image"><img src={grapheme.block_img} alt="Block" /></div>}
                      <div className="grapheme-content">
                        <div className="grapheme-header">
                          <span className="grapheme-sign">{grapheme.mhd_code_sub || grapheme.grapheme_code}</span>
                          {grapheme.syllabic_value && <span className="grapheme-phonetic">{grapheme.syllabic_value}</span>}
                        </div>
                        {grapheme.block_maya1 && <div className="grapheme-maya">{grapheme.block_maya1}</div>}
                        {grapheme.block_english && <div className="grapheme-english">"{grapheme.block_english}"</div>}
                        <div className="grapheme-meta">
                          {grapheme.artifact_code && <span>Artifact: {grapheme.artifact_code}</span>}
                          {grapheme.event_calendar && <span>Date: {grapheme.event_calendar}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(p => p - 1)} 
                  disabled={!hasPrevPage}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                
                <div className="pagination-pages">
                  {page > 2 && (
                    <>
                      <button onClick={() => setPage(1)} className="pagination-page">1</button>
                      {page > 3 && <span className="pagination-ellipsis">...</span>}
                    </>
                  )}
                  
                  {hasPrevPage && (
                    <button onClick={() => setPage(page - 1)} className="pagination-page">{page - 1}</button>
                  )}
                  
                  <button className="pagination-page active">{page}</button>
                  
                  {hasNextPage && (
                    <button onClick={() => setPage(page + 1)} className="pagination-page">{page + 1}</button>
                  )}
                  
                  {page < totalPages - 1 && (
                    <>
                      {page < totalPages - 2 && <span className="pagination-ellipsis">...</span>}
                      <button onClick={() => setPage(totalPages)} className="pagination-page">{totalPages}</button>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={() => setPage(p => p + 1)} 
                  disabled={!hasNextPage}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Grapheme Modal */}
      {selectedGraphemeId && (
        <GraphemeModal
          graphemeId={selectedGraphemeId}
          onClose={() => setSelectedGraphemeId(null)}
          onNext={selectedGraphemeIndex < results.length - 1 ? handleNextGrapheme : undefined}
          onPrev={selectedGraphemeIndex > 0 ? handlePrevGrapheme : undefined}
        />
      )}

      {/* Block Modal */}
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
