// src/components/search/SearchFilters.tsx - FIXED VERSION
import { Filter, Image, Database, FileText, Grid3x3, Calendar, X, ChevronDown } from 'lucide-react';
import type { SearchFilters } from '../../hooks/useSearchFilters';

interface SearchFiltersProps {
  viewMode: 'signs' | 'blocks' | 'graphemes';
  onViewModeChange: (mode: 'signs' | 'blocks' | 'graphemes') => void;
  filters: SearchFilters;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export function SearchFiltersComponent({
  viewMode,
  onViewModeChange,
  filters,
  updateFilter,
  clearFilters,
  activeFilterCount,
  expanded,
  setExpanded
}: SearchFiltersProps) {
  // Don't show badge if only view mode is selected (no real filters)
  const showFilterBadge = activeFilterCount > 0;

  return (
    <div className="filters-compact">
      <button 
        className="filters-toggle-compact" 
        onClick={() => setExpanded(!expanded)}
      >
        <Filter size={18} />
        <span>Filters</span>
        {showFilterBadge && (
          <span className="filter-badge">{activeFilterCount}</span>
        )}
        <ChevronDown size={16} className={expanded ? 'rotated' : ''} />
      </button>

      {expanded && (
        <div className="filters-dropdown">
          {/* View Mode Section */}
          <div className="filter-section">
            <div className="filter-section-label">View</div>
            <div className="view-mode-pills">
              <button 
                className={`view-pill ${viewMode === 'signs' ? 'active' : ''}`}
                onClick={() => onViewModeChange('signs')}
              >
                <Grid3x3 size={16} />
                <span>Signs</span>
              </button>
              <button 
                className={`view-pill ${viewMode === 'blocks' ? 'active' : ''}`}
                onClick={() => onViewModeChange('blocks')}
              >
                <FileText size={16} />
                <span>Blocks</span>
              </button>
              <button 
                className={`view-pill ${viewMode === 'graphemes' ? 'active' : ''}`}
                onClick={() => onViewModeChange('graphemes')}
              >
                <Database size={16} />
                <span>Graphemes</span>
              </button>
            </div>
          </div>

          {/* Clear Button - only show if there are actual filters */}
          {activeFilterCount > 0 && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <X size={14} />
              <span>Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Signs Filters */}
          {viewMode === 'signs' && (
            <>
              <div className="filter-section">
                <div className="filter-section-label">Quality</div>
                <div className="filter-chips-grid">
                  <button 
                    className={`filter-chip ${filters.hasImage ? 'active' : ''}`}
                    onClick={() => updateFilter('hasImage', !filters.hasImage)}
                  >
                    <Image size={14} />
                    <span>Has Image</span>
                  </button>
                  <button 
                    className={`filter-chip ${filters.hasRoboflow ? 'active' : ''}`}
                    onClick={() => updateFilter('hasRoboflow', !filters.hasRoboflow)}
                  >
                    <Database size={14} />
                    <span>ML Training</span>
                  </button>
                  <button 
                    className={`filter-chip ${filters.hasInstances ? 'active' : ''}`}
                    onClick={() => updateFilter('hasInstances', !filters.hasInstances)}
                  >
                    <FileText size={14} />
                    <span>Corpus Examples</span>
                  </button>
                  <button 
                    className={`filter-chip ${filters.hasTranslation ? 'active' : ''}`}
                    onClick={() => updateFilter('hasTranslation', !filters.hasTranslation)}
                  >
                    <FileText size={14} />
                    <span>Has Translation</span>
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-section-label">Attributes</div>
                <div className="filter-selects-grid">
                  <select 
                    className="filter-select-compact" 
                    value={filters.volume} 
                    onChange={(e) => updateFilter('volume', e.target.value)}
                  >
                    <option value="all">All Periods</option>
                    <option value="Classic">Classic (1978)</option>
                    <option value="Codices">Codices (568)</option>
                  </select>

                  <select 
                    className="filter-select-compact" 
                    value={filters.wordClass} 
                    onChange={(e) => updateFilter('wordClass', e.target.value)}
                  >
                    <option value="all">All Word Classes</option>
                    <option value="noun">Noun (733)</option>
                    <option value="transitive verb">Transitive Verb (102)</option>
                    <option value="intransitive verb">Intransitive Verb (95)</option>
                    <option value="numeral">Numeral (101)</option>
                    <option value="adjective">Adjective (49)</option>
                    <option value="positional">Positional (14)</option>
                  </select>

                  <select 
                    className="filter-select-compact" 
                    value={filters.technique} 
                    onChange={(e) => updateFilter('technique', e.target.value)}
                  >
                    <option value="all">All Techniques</option>
                    <option value="carved">Carved (1268)</option>
                    <option value="painted">Painted (710)</option>
                    <option value="codical">Codical (568)</option>
                  </select>

                  <select 
                    className="filter-select-compact" 
                    value={filters.distribution} 
                    onChange={(e) => updateFilter('distribution', e.target.value)}
                  >
                    <option value="all">All Distributions</option>
                    <option value="both">Both (1211)</option>
                    <option value="monuments">Monuments Only (1171)</option>
                    <option value="codices">Codices Only (164)</option>
                  </select>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-section-label">Sort</div>
                <select 
                  className="filter-select-compact" 
                  value={filters.sortBy} 
                  onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                >
                  <option value="code">By Code</option>
                  <option value="frequency">By Frequency</option>
                  <option value="completeness">By Completeness</option>
                </select>
              </div>
            </>
          )}

          {/* Blocks Filters */}
          {viewMode === 'blocks' && (
            <>
              <div className="filter-section">
                <div className="filter-section-label">Quality</div>
                <div className="filter-chips-grid">
                  <button 
                    className={`filter-chip ${filters.hasDate ? 'active' : ''}`}
                    onClick={() => updateFilter('hasDate', !filters.hasDate)}
                  >
                    <Calendar size={14} />
                    <span>Has Date</span>
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-section-label">Location</div>
                <div className="filter-selects-grid">
                  <select 
                    className="filter-select-compact" 
                    value={filters.region} 
                    onChange={(e) => updateFilter('region', e.target.value)}
                  >
                    <option value="all">All Regions</option>
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
                    placeholder="Artifact code (e.g., PAL)"
                    value={filters.artifact}
                    onChange={(e) => updateFilter('artifact', e.target.value)}
                  />

                  <input
                    type="text"
                    className="filter-input-compact"
                    placeholder="Site name"
                    value={filters.site}
                    onChange={(e) => updateFilter('site', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Graphemes Filters */}
          {viewMode === 'graphemes' && (
            <>
              <div className="filter-section">
                <div className="filter-section-label">Quality</div>
                <div className="filter-chips-grid">
                  <button 
                    className={`filter-chip ${filters.hasImage ? 'active' : ''}`}
                    onClick={() => updateFilter('hasImage', !filters.hasImage)}
                  >
                    <Image size={14} />
                    <span>Has Image</span>
                  </button>
                  <button 
                    className={`filter-chip ${filters.hasDate ? 'active' : ''}`}
                    onClick={() => updateFilter('hasDate', !filters.hasDate)}
                  >
                    <Calendar size={14} />
                    <span>Has Date</span>
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-section-label">Location</div>
                <div className="filter-selects-grid">
                  <select 
                    className="filter-select-compact" 
                    value={filters.region} 
                    onChange={(e) => updateFilter('region', e.target.value)}
                  >
                    <option value="all">All Regions</option>
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
                    placeholder="Artifact code"
                    value={filters.artifact}
                    onChange={(e) => updateFilter('artifact', e.target.value)}
                  />

                  <input
                    type="text"
                    className="filter-input-compact"
                    placeholder="Site name"
                    value={filters.site}
                    onChange={(e) => updateFilter('site', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
