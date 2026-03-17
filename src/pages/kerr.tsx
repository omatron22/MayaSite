import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';

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
  const [inputFocused, setInputFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), []);

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      {/* Search bar — matches search page style */}
      <table className="w-auto mb-2">
        <tbody>
          <tr>
            <td className="px-3 py-2 cursor-text" onClick={() => searchInputRef.current?.focus()}>
              <div className="flex items-center">
                <span className="font-[800] select-none shrink-0">&gt;&nbsp;</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="absolute opacity-0 pointer-events-none"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
                {inputFocused || query ? (
                  <>
                    <span className="font-[600]">{query}</span>
                    <span className="blink-cursor font-[800] select-none">|</span>
                  </>
                ) : (
                  <span className="select-none">search by K-number or description...</span>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Results bar */}
      {data && !loading && (
        <div className="flex items-center justify-between mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <strong>{data.total.toLocaleString()}</strong> vessels
                  {query && <span> matching &quot;{query}&quot;</span>}
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
              <td className="px-3 py-2 cursor-pointer" onClick={() => setPage(1)}>
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

      {!loading && !error && data && data.results.length === 0 && (
        <table className="w-auto mt-4">
          <tbody>
            <tr>
              <td className="px-3 py-2 text-sm">
                No vessels found.
                {query ? ' Try adjusting your search.' : ''}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {!loading && data && data.results.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-0 border-t-2 border-l-2 border-black">
            {data.results.map(vessel => (
              <a
                key={vessel.id}
                href={vessel.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-r-2 border-b-2 border-black overflow-hidden no-underline block"
              >
                <div className="bg-white aspect-[4/3] flex items-center justify-center overflow-hidden">
                  <img
                    src={vessel.image_url}
                    alt={vessel.k_number}
                    loading="lazy"
                    width={280}
                    height={210}
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="px-2 py-1.5 border-t border-black">
                  <span className="text-xs font-[800] text-black underline">{vessel.k_number}</span>
                  {vessel.description && (
                    <p className="text-[10px] text-black line-clamp-2 leading-snug m-0 mt-0.5">{vessel.description}</p>
                  )}
                </div>
              </a>
            ))}
          </div>

          {/* Pagination — matches search page */}
          {totalPages > 1 && (
            <table className="w-auto mt-6">
              <tbody>
                <tr>
                  {hasPrevPage && (
                    <td className="px-3 py-1 cursor-pointer" onClick={() => setPage(p => Math.max(1, p - 1))}>
                      <span className="text-sm">Prev</span>
                    </td>
                  )}
                  {page > 2 && (
                    <td className="px-3 py-1 cursor-pointer" onClick={() => setPage(1)}>
                      <span className="text-sm">1</span>
                    </td>
                  )}
                  {page > 3 && <td className="px-1 py-1 text-sm">...</td>}
                  {hasPrevPage && (
                    <td className="px-3 py-1 cursor-pointer" onClick={() => setPage(p => p - 1)}>
                      <span className="text-sm">{page - 1}</span>
                    </td>
                  )}
                  <td className="px-3 py-1">
                    <strong>[{page}]</strong>
                  </td>
                  {hasNextPage && (
                    <td className="px-3 py-1 cursor-pointer" onClick={() => setPage(p => p + 1)}>
                      <span className="text-sm">{page + 1}</span>
                    </td>
                  )}
                  {page < totalPages - 2 && <td className="px-1 py-1 text-sm">...</td>}
                  {page < totalPages - 1 && (
                    <td className="px-3 py-1 cursor-pointer" onClick={() => setPage(totalPages)}>
                      <span className="text-sm">{totalPages}</span>
                    </td>
                  )}
                  {hasNextPage && (
                    <td className="px-3 py-1 cursor-pointer" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                      <span className="text-sm">Next</span>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
