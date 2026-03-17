import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchFilters } from '../../hooks/useSearchFilters';
import { PopupSelect } from './PopupSelect';
import { getAllUniqueSites } from '../../lib/sites';

interface SearchFiltersProps {
  viewMode: 'signs' | 'blocks' | 'graphemes' | 'concordance';
  onViewModeChange: (mode: 'signs' | 'blocks' | 'graphemes' | 'concordance') => void;
  filters: SearchFilters;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  searchRow?: React.ReactNode;
}

const inputClass = "bg-white text-black text-xs border-none outline-none w-[80px] placeholder:text-black";

const REGIONS = ['North', 'East', 'Central', 'Usmacinta', 'South'] as const;

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <td className="px-3 py-1 text-center cursor-pointer" onClick={onClick}>
      <span className="text-xs inline-grid">
        {/* Invisible spacer reserves width for bracketed state */}
        <span className="invisible col-start-1 row-start-1 font-[800]">[{label}]</span>
        <span className="col-start-1 row-start-1">
          {active ? <strong>[{label}]</strong> : label}
        </span>
      </span>
    </td>
  );
}

export function SearchFiltersComponent({
  viewMode,
  onViewModeChange,
  filters,
  updateFilter,
  clearFilters: _clearFilters,
  activeFilterCount: _activeFilterCount,
  searchRow,
}: SearchFiltersProps) {
  const navigate = useNavigate();
  const siteNames = useMemo(() => {
    return Array.from(getAllUniqueSites().keys()).sort();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Search + View mode */}
      <table className="w-full">
        <tbody>
          {searchRow}
          <tr>
            {(['signs', 'blocks', 'graphemes', 'concordance'] as const).map(mode => {
              const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
              return (
                <td key={mode} className="px-3 py-1 cursor-pointer" onClick={() => onViewModeChange(mode)}>
                  <span className="text-sm inline-grid">
                    <span className="invisible col-start-1 row-start-1 font-[800]">[{modeLabel}]</span>
                    <span className="col-start-1 row-start-1">
                      {viewMode === mode ? <strong>[{modeLabel}]</strong> : modeLabel}
                    </span>
                  </span>
                </td>
              );
            })}
            <td className="px-3 py-1 cursor-pointer" onClick={() => navigate('/search/scanner')}>
              <span className="text-sm">Scanner</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signs filters — staircase: fewest to most options */}
      {viewMode === 'signs' && (
        <table className="w-auto">
          <tbody>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Period:</td>
              <ToggleButton label="Classic" active={filters.volumes.includes('Classic')} onClick={() => updateFilter('volumes', toggle(filters.volumes, 'Classic'))} />
              <ToggleButton label="Codices" active={filters.volumes.includes('Codices')} onClick={() => updateFilter('volumes', toggle(filters.volumes, 'Codices'))} />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Distrib:</td>
              <ToggleButton label="Monuments" active={filters.distributions.includes('Monuments')} onClick={() => updateFilter('distributions', toggle(filters.distributions, 'Monuments'))} />
              <ToggleButton label="Codices" active={filters.distributions.includes('Codices')} onClick={() => updateFilter('distributions', toggle(filters.distributions, 'Codices'))} />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Technique:</td>
              <ToggleButton label="Carved" active={filters.techniques.includes('Carved')} onClick={() => updateFilter('techniques', toggle(filters.techniques, 'Carved'))} />
              <ToggleButton label="Painted" active={filters.techniques.includes('Painted')} onClick={() => updateFilter('techniques', toggle(filters.techniques, 'Painted'))} />
              <ToggleButton label="Codical" active={filters.techniques.includes('Codical')} onClick={() => updateFilter('techniques', toggle(filters.techniques, 'Codical'))} />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Data:</td>
              <ToggleButton label="Image" active={filters.hasImage} onClick={() => updateFilter('hasImage', !filters.hasImage)} />
              <ToggleButton label="ML" active={filters.hasRoboflow} onClick={() => updateFilter('hasRoboflow', !filters.hasRoboflow)} />
              <ToggleButton label="Corpus" active={filters.hasInstances} onClick={() => updateFilter('hasInstances', !filters.hasInstances)} />
              <ToggleButton label="Transl" active={filters.hasTranslation} onClick={() => updateFilter('hasTranslation', !filters.hasTranslation)} />
              <ToggleButton label="Variants" active={filters.collapseVariants} onClick={() => updateFilter('collapseVariants', !filters.collapseVariants)} />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Class:</td>
              <ToggleButton label="Noun" active={filters.wordClasses.includes('noun')} onClick={() => updateFilter('wordClasses', toggle(filters.wordClasses, 'noun'))} />
              <ToggleButton label="Trans-V" active={filters.wordClasses.includes('transitive verb')} onClick={() => updateFilter('wordClasses', toggle(filters.wordClasses, 'transitive verb'))} />
              <ToggleButton label="Intrans-V" active={filters.wordClasses.includes('intransitive verb')} onClick={() => updateFilter('wordClasses', toggle(filters.wordClasses, 'intransitive verb'))} />
              <ToggleButton label="Numeral" active={filters.wordClasses.includes('numeral')} onClick={() => updateFilter('wordClasses', toggle(filters.wordClasses, 'numeral'))} />
              <ToggleButton label="Adj" active={filters.wordClasses.includes('adjective')} onClick={() => updateFilter('wordClasses', toggle(filters.wordClasses, 'adjective'))} />
              <ToggleButton label="Positional" active={filters.wordClasses.includes('positional')} onClick={() => updateFilter('wordClasses', toggle(filters.wordClasses, 'positional'))} />
            </tr>
          </tbody>
        </table>
      )}

      {/* Blocks filters — staircase */}
      {viewMode === 'blocks' && (
        <table className="w-auto">
          <tbody>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Data:</td>
              <ToggleButton label="Dated" active={filters.hasDate} onClick={() => updateFilter('hasDate', !filters.hasDate)} />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Artifact:</td>
              <td className="px-3 py-1">
                <div className="flex items-center text-xs"><span className="font-[800] select-none">&gt;&nbsp;</span><input type="text" className={inputClass} placeholder="code..." value={filters.artifact} onChange={(e) => updateFilter('artifact', e.target.value)} /></div>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Site:</td>
              <PopupSelect
                label="Site:"
                options={siteNames}
                selected={filters.sites}
                onToggle={(v) => updateFilter('sites', toggle(filters.sites, v))}
                onClear={() => updateFilter('sites', [])}
              />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Region:</td>
              {REGIONS.map(r => (
                <ToggleButton key={r} label={r} active={filters.regions.includes(r)} onClick={() => updateFilter('regions', toggle(filters.regions, r))} />
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {/* Graphemes filters — staircase: fewest to most */}
      {viewMode === 'graphemes' && (
        <table className="w-auto">
          <tbody>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Artifact:</td>
              <td className="px-3 py-1">
                <div className="flex items-center text-xs"><span className="font-[800] select-none">&gt;&nbsp;</span><input type="text" className={inputClass} placeholder="code..." value={filters.artifact} onChange={(e) => updateFilter('artifact', e.target.value)} /></div>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Site:</td>
              <PopupSelect
                label="Site:"
                options={siteNames}
                selected={filters.sites}
                onToggle={(v) => updateFilter('sites', toggle(filters.sites, v))}
                onClear={() => updateFilter('sites', [])}
              />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Data:</td>
              <ToggleButton label="Image" active={filters.hasImage} onClick={() => updateFilter('hasImage', !filters.hasImage)} />
              <ToggleButton label="Dated" active={filters.hasDate} onClick={() => updateFilter('hasDate', !filters.hasDate)} />
            </tr>
            <tr>
              <td className="px-3 py-1 text-xs font-[800]">Region:</td>
              {REGIONS.map(r => (
                <ToggleButton key={r} label={r} active={filters.regions.includes(r)} onClick={() => updateFilter('regions', toggle(filters.regions, r))} />
              ))}
            </tr>
          </tbody>
        </table>
      )}

    </div>
  );
}
