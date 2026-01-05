// src/components/search/SearchFilters.tsx
import { FilterIcon, ImageIcon, CalendarIcon, ChevronDownIcon, XIcon } from './icons';
import type { SearchFilters } from '../../hooks/useSearchFilters';

interface SearchFiltersProps {
  viewMode: 'signs' | 'blocks' | 'graphemes';
  filters: SearchFilters;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export function SearchFiltersComponent({
  viewMode,
  filters,
  updateFilter,
  clearFilters,
  activeFilterCount,
  expanded,
  setExpanded
}: SearchFiltersProps) {
  return (
    <div className="filters-compact">
      <button 
        className="filters-toggle-compact" 
        onClick={() => setExpanded(!expanded)}
      >
        <FilterIcon />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="filter-badge">{activeFilterCount}</span>
        )}
        <ChevronDownIcon />
      </button>

      {expanded && (
        <div className="filters-dropdown">
          {activeFilterCount > 0 && (
            <button className="clear-btn" onClick={clearFilters}>
              <XIcon /> Clear all filters
            </button>
          )}

          {/* Signs filters */}
          {viewMode === 'signs' && (
            <div className="filter-grid-compact">
              <div className="filter-row">
                <button 
                  className={`filter-chip ${filters.hasImage ? 'active' : ''}`}
                  onClick={() => updateFilter('hasImage', !filters.hasImage)}
                >
                  <ImageIcon /> Has Image
                </button>
                <button 
                  className={`filter-chip ${filters.hasRoboflow ? 'active' : ''}`}
                  onClick={() => updateFilter('hasRoboflow', !filters.hasRoboflow)}
                >
                  🤖 ML Training Data
                </button>
                <button 
                  className={`filter-chip ${filters.hasInstances ? 'active' : ''}`}
                  onClick={() => updateFilter('hasInstances', !filters.hasInstances)}
                >
                  📊 Has Corpus Examples
                </button>
                <button 
                  className={`filter-chip ${filters.hasTranslation ? 'active' : ''}`}
                  onClick={() => updateFilter('hasTranslation', !filters.hasTranslation)}
                >
                  📝 Has Translation
                </button>
              </div>

              <div className="filter-row">
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

              <div className="filter-row">
                <select 
                  className="filter-select-compact" 
                  value={filters.sortBy} 
                  onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                >
                  <option value="code">Sort by Code</option>
                  <option value="frequency">Sort by Frequency</option>
                  <option value="completeness">Sort by Completeness</option>
                </select>
              </div>
            </div>
          )}

          {/* Blocks filters */}
          {viewMode === 'blocks' && (
            <div className="filter-grid-compact">
              <div className="filter-row">
                <button 
                  className={`filter-chip ${filters.hasDate ? 'active' : ''}`}
                  onClick={() => updateFilter('hasDate', !filters.hasDate)}
                >
                  <CalendarIcon /> Has Date
                </button>
              </div>

              <div className="filter-row">
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
                  placeholder="Site name (e.g., Palenque)"
                  value={filters.site}
                  onChange={(e) => updateFilter('site', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Graphemes filters */}
          {viewMode === 'graphemes' && (
            <div className="filter-grid-compact">
              <div className="filter-row">
                <button 
                  className={`filter-chip ${filters.hasImage ? 'active' : ''}`}
                  onClick={() => updateFilter('hasImage', !filters.hasImage)}
                >
                  <ImageIcon /> Has Image
                </button>
                <button 
                  className={`filter-chip ${filters.hasDate ? 'active' : ''}`}
                  onClick={() => updateFilter('hasDate', !filters.hasDate)}
                >
                  <CalendarIcon /> Has Date
                </button>
              </div>

              <div className="filter-row">
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
                  placeholder="Site name (e.g., Palenque)"
                  value={filters.site}
                  onChange={(e) => updateFilter('site', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
