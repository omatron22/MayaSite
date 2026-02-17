import { useState, useEffect, useMemo } from 'react';
import { Search, ExternalLink } from 'lucide-react';
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

  const selectClass = "py-2 pr-8 pl-3 bg-white text-gray-700 border border-gray-300 rounded-md text-sm cursor-pointer transition-colors appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2020%2020%27%3E%3Cpath%20stroke=%27%236b7280%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%271.5%27%20d=%27M6%208l4%204%204-4%27/%3E%3C/svg%3E')] bg-[position:right_0.5rem_center] bg-no-repeat bg-[length:1rem] hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <div className="p-6 max-md:p-4">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Corpus of Maya Hieroglyphic Inscriptions</h1>
        <p className="text-gray-500 text-sm mb-6">Line drawings and photographs from Harvard's Peabody Museum</p>

        <div className="flex gap-3 mb-6 flex-wrap">
          <select className={selectClass} value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
            <option value="">All Sites</option>
            {siteOptions.map(s => (
              <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
            ))}
          </select>
          <select className={selectClass} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            <option value="">All Types</option>
            <option value="drawing">Drawings</option>
            <option value="photo">Photos</option>
          </select>
          {(selectedSite || selectedType) && (
            <button
              className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              onClick={() => { setSelectedSite(''); setSelectedType(''); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="text-center py-8 text-red-600">
            <p className="mb-4">{error}</p>
            <button className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50" onClick={() => { setSelectedSite(''); setSelectedType(''); }}>Retry</button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                <div className="bg-gray-100 aspect-square" />
                <div className="p-3"><div className="h-4 bg-gray-100 rounded w-2/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && data && data.images.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">No images found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
          </div>
        )}

        {!loading && data && data.images.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">{data.images.length.toLocaleString()} images</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {data.images.map(img => (
                <a
                  key={img.id}
                  href={img.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-gray-200 rounded-lg overflow-hidden no-underline hover:shadow-md transition-shadow group"
                >
                  <div className="bg-gray-50 aspect-square flex items-center justify-center overflow-hidden">
                    <img
                      src={img.image_url}
                      alt={`${img.site_name} ${img.monument_type || ''} ${img.monument_number || ''}`}
                      loading="lazy"
                      width={200}
                      height={200}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{img.site_name}</span>
                      <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500" />
                    </div>
                    <div className="text-xs text-gray-500">
                      {img.monument_type && <span>{img.monument_type} {img.monument_number}</span>}
                      {img.monument_type && <span className="mx-1">&middot;</span>}
                      <span className={img.image_type === 'drawing' ? 'text-blue-600' : 'text-amber-600'}>
                        {img.image_type}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
