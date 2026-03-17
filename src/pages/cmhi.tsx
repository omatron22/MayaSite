import { useState, useEffect, useMemo } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';

import { fetchCmhi } from '../lib/api';
import type { CmhiResponse } from '../lib/api';

export function CmhiPage() {
  const [data, setData] = useState<CmhiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCmhi(
      { site: selectedSite || undefined, type: selectedType || undefined },
      controller.signal,
    )
      .then(setData)
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load CMHI data');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedSite, selectedType]);

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
      <table className="w-auto mb-4">
        <thead>
          <tr>
            <th className="px-3 py-1 text-left text-xs uppercase" colSpan={2}>Corpus of Maya Hieroglyphic Inscriptions</th>
            <th className="px-3 py-1 text-right text-xs">{!loading && data ? `${data.images.length.toLocaleString()} images` : ''}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2">
              <select
                className="w-full py-1.5 px-2 bg-white border-2 border-black text-sm cursor-pointer focus:outline-none"
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
              >
                <option value="">All Sites</option>
                {siteOptions.map(s => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2">
              <select
                className="w-full py-1.5 px-2 bg-white border-2 border-black text-sm cursor-pointer focus:outline-none"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="drawing">Drawings</option>
                <option value="photo">Photos</option>
              </select>
            </td>
            <td className="px-3 py-2 text-right">
              {(selectedSite || selectedType) && (
                <span
                  className="text-xs underline cursor-pointer hover:no-underline"
                  onClick={() => { setSelectedSite(''); setSelectedType(''); }}
                >
                  Clear
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {error && (
        <table className="w-auto mb-4">
          <tbody>
            <tr>
              <td className="px-3 py-4 text-sm text-center">
                {error}
                <span className="ml-2 cursor-pointer underline" onClick={() => { setSelectedSite(''); setSelectedType(''); }}>Retry</span>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <ProgressBarLoader />
        </div>
      )}

      {!loading && !error && data && data.images.length === 0 && (
        <table className="w-auto">
          <tbody>
            <tr>
              <td className="px-3 py-8 text-sm text-center">No images found. Try adjusting your filters.</td>
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
