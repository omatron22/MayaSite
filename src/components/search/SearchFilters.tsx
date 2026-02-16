import { Image, Database, FileText, Calendar, X } from 'lucide-react';
import type { SearchFilters } from '../../hooks/useSearchFilters';

interface SearchFiltersProps {
  viewMode: 'signs' | 'blocks' | 'graphemes' | 'concordance';
  onViewModeChange: (mode: 'signs' | 'blocks' | 'graphemes' | 'concordance') => void;
  filters: SearchFilters;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  concordanceFilters?: Record<string, boolean>;
  onConcordanceFilterToggle?: (key: string) => void;
}

const selectClass = "flex-1 min-w-[150px] py-2 pr-8 pl-3 bg-white text-gray-700 border border-gray-300 rounded-md text-sm cursor-pointer transition-colors appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3E%3Cpath%20stroke=%27%236b7280%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.5%27%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E')] bg-[position:right_0.5rem_center] bg-no-repeat bg-[length:1rem] hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const inputClass = "flex-1 min-w-[150px] py-2 px-3 bg-white text-gray-700 border border-gray-300 rounded-md text-sm transition-colors hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400";

const CONCORDANCE_FILTERS = [
  { key: 'hasThompson', label: 'Thompson' },
  { key: 'hasZender', label: 'Zender' },
  { key: 'hasKettunen', label: 'Kettunen' },
  { key: 'hasGronemeyer', label: 'Gronemeyer' },
] as const;

export function SearchFiltersComponent({
  viewMode,
  onViewModeChange,
  filters,
  updateFilter,
  clearFilters,
  activeFilterCount,
  concordanceFilters,
  onConcordanceFilterToggle,
}: SearchFiltersProps) {
  const tabBtn = (mode: 'signs' | 'blocks' | 'graphemes' | 'concordance', label: string) => (
    <button
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        viewMode === mode
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
      onClick={() => onViewModeChange(mode)}
    >
      {label}
    </button>
  );

  const filterChip = (label: string, icon: React.ReactNode, active: boolean, onClick: () => void) => (
    <button
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* View mode tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabBtn('signs', 'Signs')}
        {tabBtn('blocks', 'Blocks')}
        {tabBtn('graphemes', 'Graphemes')}
        {tabBtn('concordance', 'Concordance')}
      </div>

      {/* Concordance mode filters */}
      {viewMode === 'concordance' && (
        <div className="flex gap-2 flex-wrap">
          {CONCORDANCE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onConcordanceFilterToggle?.(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                concordanceFilters?.[f.key]
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              Has {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Sign/block/grapheme filters - inline bar */}
      {viewMode !== 'concordance' && (
        <div className="flex flex-col gap-3">
          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors self-start"
              onClick={clearFilters}
            >
              <X size={12} />
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}

          {/* Signs Filters */}
          {viewMode === 'signs' && (
            <>
              <div className="flex gap-2 flex-wrap">
                {filterChip('Has Image', <Image size={12} />, filters.hasImage, () => updateFilter('hasImage', !filters.hasImage))}
                {filterChip('ML Training', <Database size={12} />, filters.hasRoboflow, () => updateFilter('hasRoboflow', !filters.hasRoboflow))}
                {filterChip('Corpus Examples', <FileText size={12} />, filters.hasInstances, () => updateFilter('hasInstances', !filters.hasInstances))}
                {filterChip('Has Translation', <FileText size={12} />, filters.hasTranslation, () => updateFilter('hasTranslation', !filters.hasTranslation))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className={selectClass} value={filters.volume} onChange={(e) => updateFilter('volume', e.target.value)}>
                  <option value="all">All Periods</option>
                  <option value="Classic">Classic (1978)</option>
                  <option value="Codices">Codices (568)</option>
                </select>
                <select className={selectClass} value={filters.wordClass} onChange={(e) => updateFilter('wordClass', e.target.value)}>
                  <option value="all">All Word Classes</option>
                  <option value="noun">Noun (733)</option>
                  <option value="transitive verb">Transitive Verb (102)</option>
                  <option value="intransitive verb">Intransitive Verb (95)</option>
                  <option value="numeral">Numeral (101)</option>
                  <option value="adjective">Adjective (49)</option>
                  <option value="positional">Positional (14)</option>
                </select>
                <select className={selectClass} value={filters.technique} onChange={(e) => updateFilter('technique', e.target.value)}>
                  <option value="all">All Techniques</option>
                  <option value="carved">Carved (1268)</option>
                  <option value="painted">Painted (710)</option>
                  <option value="codical">Codical (568)</option>
                </select>
                <select className={selectClass} value={filters.distribution} onChange={(e) => updateFilter('distribution', e.target.value)}>
                  <option value="all">All Distributions</option>
                  <option value="both">Both (1211)</option>
                  <option value="monuments">Monuments Only (1171)</option>
                  <option value="codices">Codices Only (164)</option>
                </select>
              </div>
              <div>
                <select
                  className={selectClass}
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value as 'code' | 'frequency' | 'completeness')}
                >
                  <option value="code">Sort by Code</option>
                  <option value="frequency">Sort by Frequency</option>
                  <option value="completeness">Sort by Completeness</option>
                </select>
              </div>
            </>
          )}

          {/* Blocks Filters */}
          {viewMode === 'blocks' && (
            <>
              <div className="flex gap-2 flex-wrap">
                {filterChip('Has Date', <Calendar size={12} />, filters.hasDate, () => updateFilter('hasDate', !filters.hasDate))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className={selectClass} value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
                  <option value="all">All Regions</option>
                  <option value="North">North (Yucatan)</option>
                  <option value="East">East</option>
                  <option value="Central">Central (Peten)</option>
                  <option value="Usmacinta">Usmacinta</option>
                  <option value="South">South</option>
                  <option value="West">West</option>
                </select>
                <input type="text" className={inputClass} placeholder="Artifact code (e.g., PAL)" value={filters.artifact} onChange={(e) => updateFilter('artifact', e.target.value)} />
                <input type="text" className={inputClass} placeholder="Site name" value={filters.site} onChange={(e) => updateFilter('site', e.target.value)} />
              </div>
            </>
          )}

          {/* Graphemes Filters */}
          {viewMode === 'graphemes' && (
            <>
              <div className="flex gap-2 flex-wrap">
                {filterChip('Has Image', <Image size={12} />, filters.hasImage, () => updateFilter('hasImage', !filters.hasImage))}
                {filterChip('Has Date', <Calendar size={12} />, filters.hasDate, () => updateFilter('hasDate', !filters.hasDate))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className={selectClass} value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
                  <option value="all">All Regions</option>
                  <option value="North">North (Yucatan)</option>
                  <option value="East">East</option>
                  <option value="Central">Central (Peten)</option>
                  <option value="Usmacinta">Usmacinta</option>
                  <option value="South">South</option>
                  <option value="West">West</option>
                </select>
                <input type="text" className={inputClass} placeholder="Artifact code" value={filters.artifact} onChange={(e) => updateFilter('artifact', e.target.value)} />
                <input type="text" className={inputClass} placeholder="Site name" value={filters.site} onChange={(e) => updateFilter('site', e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
