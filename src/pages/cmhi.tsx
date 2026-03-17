import { useState, useEffect, useMemo } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { PopupSelect } from '../components/search/PopupSelect';

import { fetchCmhi } from '../lib/api';
import type { CmhiResponse } from '../lib/api';

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <td className="px-3 py-1 text-center cursor-pointer" onClick={onClick}>
      <span className="text-xs inline-grid">
        <span className="invisible col-start-1 row-start-1 font-[800]">[{label}]</span>
        <span className="col-start-1 row-start-1">
          {active ? <strong>[{label}]</strong> : label}
        </span>
      </span>
    </td>
  );
}

export function CmhiPage() {
  const [data, setData] = useState<CmhiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCmhi(
      {
        site: selectedSites.length > 0 ? selectedSites.join(',') : undefined,
        type: selectedType || undefined,
      },
      controller.signal,
    )
      .then(setData)
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load CMHI data');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedSites, selectedType]);

  const siteNames = useMemo(() => {
    if (!data) return [];
    const sites = new Map<string, string>();
    for (const s of data.sites) {
      if (!sites.has(s.site_code)) sites.set(s.site_code, s.site_name);
    }
    return Array.from(sites.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code]) => code);
  }, [data]);

  // Build a display map for site codes -> names
  const siteDisplayMap = useMemo(() => {
    if (!data) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const s of data.sites) {
      if (!map.has(s.site_code)) map.set(s.site_code, s.site_name);
    }
    return map;
  }, [data]);

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      {/* Filters — matches search page table style */}
      <table className="w-auto mb-2">
        <tbody>
          <tr>
            <td className="px-3 py-1 text-xs font-[800]">Site:</td>
            <PopupSelect
              label="Site:"
              options={siteNames}
              selected={selectedSites}
              onToggle={(v) => setSelectedSites(toggle(selectedSites, v))}
              onClear={() => setSelectedSites([])}
              displayMap={siteDisplayMap}
            />
          </tr>
          <tr>
            <td className="px-3 py-1 text-xs font-[800]">Type:</td>
            <ToggleButton label="Drawing" active={selectedType === 'drawing'} onClick={() => setSelectedType(selectedType === 'drawing' ? '' : 'drawing')} />
            <ToggleButton label="Photo" active={selectedType === 'photo'} onClick={() => setSelectedType(selectedType === 'photo' ? '' : 'photo')} />
          </tr>
        </tbody>
      </table>

      {/* Results bar */}
      {!loading && data && (
        <div className="flex items-center justify-between mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <strong>{data.images.length.toLocaleString()}</strong> images
                  {selectedSites.length > 0 && (
                    <span>
                      {selectedSites.length === 1
                        ? ` from ${siteDisplayMap.get(selectedSites[0]) || selectedSites[0]}`
                        : `, ${selectedSites.length} sites`}
                    </span>
                  )}
                  {selectedType && <span>, {selectedType}s</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <table className="w-auto mt-4">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">{error}</td>
              <td className="px-3 py-2 cursor-pointer" onClick={() => { setSelectedSites([]); setSelectedType(''); }}>
                <span className="text-xs font-[800]">[Retry]</span>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <ProgressBarLoader />
        </div>
      )}

      {!loading && !error && data && data.images.length === 0 && (
        <table className="w-auto mt-4">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">No images found. Try adjusting your filters.</td>
            </tr>
          </tbody>
        </table>
      )}

      {!loading && data && data.images.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-0 border-t-2 border-l-2 border-black">
          {data.images.map(img => (
            <a
              key={img.id}
              href={img.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-r-2 border-b-2 border-black overflow-hidden no-underline block"
            >
              <div className="bg-white aspect-square flex items-center justify-center overflow-hidden">
                <img
                  src={img.image_url}
                  alt={`${img.site_name} ${img.monument_type || ''} ${img.monument_number || ''}`}
                  loading="lazy"
                  width={200}
                  height={200}
                  className="w-full h-full object-contain p-2"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="px-2 py-1.5 border-t border-black">
                <span className="text-xs font-[800] text-black">{img.site_name}</span>
                <div className="text-[10px] text-black">
                  {img.monument_type && <span>{img.monument_type} {img.monument_number}</span>}
                  {img.monument_type && <span className="mx-1">&middot;</span>}
                  <span>{img.image_type}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
