import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';

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

function SiteDropdown({ options, selected, onToggle, onClear }: {
  options: { code: string; name: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const summary = selected.length === 0
    ? '--'
    : selected.length <= 2
      ? selected.map(s => {
          const opt = options.find(o => o.code === s);
          return `[${opt?.name || s}]`;
        }).join(' ')
      : `[${options.find(o => o.code === selected[0])?.name || selected[0]}] +${selected.length - 1}`;

  return (
    <td className="px-3 py-1 relative cursor-pointer" ref={ref} onClick={() => setOpen(!open)}>
      <div className="w-[200px] overflow-hidden">
        <span className="text-xs block truncate">
          {selected.length > 0 ? <strong>{summary}</strong> : summary}
        </span>
      </div>
      {open && (
        <div
          className="absolute -left-[2px] -right-[2px] top-full z-50 bg-white border-2 border-black mt-[-2px] max-h-[300px] overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {options.map(opt => (
              <div key={opt.code} className="px-3 py-1 cursor-pointer text-xs border-b border-black last:border-b-0" onClick={() => onToggle(opt.code)}>
                {selected.includes(opt.code) ? <strong>[{opt.name}]</strong> : opt.name}
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1 border-t-2 border-black text-xs">
              <span>{selected.length} selected</span>
              <button className="cursor-pointer no-underline text-xs font-[800]" onClick={() => onClear()}>
                [Clear]
              </button>
            </div>
          )}
        </div>
      )}
    </td>
  );
}

export function CmhiPage() {
  const navigate = useNavigate();
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

  const siteOptions = useMemo(() => {
    if (!data) return [];
    const sites = new Map<string, string>();
    for (const s of data.sites) {
      if (!sites.has(s.site_code)) sites.set(s.site_code, s.site_name);
    }
    return Array.from(sites.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      {/* Tabs */}
      <table className="w-auto">
        <tbody>
          <tr>
            <td className="px-3 py-1 cursor-pointer" onClick={() => navigate('/collections/kerr')}>
              <span className="text-sm">Kerr Vases</span>
            </td>
            <td className="px-3 py-1">
              <span className="text-sm font-[800]">[CMHI]</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Filters */}
      <table className="w-auto mt-2">
        <tbody>
          <tr>
            <td className="px-3 py-1 text-xs font-[800]">Site:</td>
            <SiteDropdown
              options={siteOptions}
              selected={selectedSites}
              onToggle={(v) => setSelectedSites(toggle(selectedSites, v))}
              onClear={() => setSelectedSites([])}
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
        <div className="flex items-center justify-between mt-4 mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <strong>{data.total.toLocaleString()}</strong> images
                  {selectedSites.length > 0 && (
                    <span>
                      {selectedSites.length === 1
                        ? ` from ${siteOptions.find(s => s.code === selectedSites[0])?.name || selectedSites[0]}`
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

      {!loading && !error && data && data.total === 0 && (
        <table className="w-auto mt-4">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">No images found. Try adjusting your filters.</td>
            </tr>
          </tbody>
        </table>
      )}

      {!loading && data && data.total > 0 && (
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
