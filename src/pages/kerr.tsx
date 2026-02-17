import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { fetchKerr } from '../lib/api';
import type { KerrResponse } from '../lib/api';

const PAGE_SIZE = 48;
const DEBOUNCE_DELAY = 300;

export function KerrPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [data, setData] = useState<KerrResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, DEBOUNCE_DELAY);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchKerr({ q: debouncedQuery || undefined, page, pageSize: PAGE_SIZE }, controller.signal)
      .then(setData)
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load Kerr vessels');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, page]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), []);

  return (
    <div className="p-6 max-md:p-4">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Kerr Maya Vase Database</h1>
        <p className="text-gray-500 text-sm mb-6">Browse {data ? data.total.toLocaleString() : '...'} rollout photographs by Justin Kerr</p>

        <div className="relative mb-6 max-w-[600px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="w-full py-2.5 pr-4 pl-10 bg-white border border-gray-300 rounded-md text-gray-900 text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
            placeholder="Search by K-number or description..."
            value={query}
            onChange={handleQueryChange}
          />
        </div>

        {error && (
          <div className="text-center py-8 text-red-600">
            <p className="mb-4">{error}</p>
            <button className="px-4 py-2 border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50" onClick={() => setPage(1)}>Retry</button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                <div className="bg-gray-100 aspect-[4/3]" />
                <div className="p-3"><div className="h-4 bg-gray-100 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && data && data.results.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600 mb-2">No vessels found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search query</p>
          </div>
        )}

        {!loading && data && data.results.length > 0 && (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {data.results.map(vessel => (
                <a
                  key={vessel.id}
                  href={vessel.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-gray-200 rounded-lg overflow-hidden no-underline hover:shadow-md transition-shadow group"
                >
                  <div className="bg-gray-50 aspect-[4/3] flex items-center justify-center overflow-hidden">
                    <img
                      src={vessel.image_url}
                      alt={vessel.k_number}
                      loading="lazy"
                      width={280}
                      height={210}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{vessel.k_number}</span>
                      <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500" />
                    </div>
                    {vessel.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-snug m-0">{vessel.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-8 py-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 px-3 py-2 text-gray-700 border border-gray-300 rounded-md cursor-pointer text-sm font-medium transition-colors hover:not-disabled:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                  <span className="max-md:hidden">Previous</span>
                </button>
                <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1.5 px-3 py-2 text-gray-700 border border-gray-300 rounded-md cursor-pointer text-sm font-medium transition-colors hover:not-disabled:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="max-md:hidden">Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
