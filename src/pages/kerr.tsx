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
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      <table className="w-auto mb-4">
        <thead>
          <tr>
            <th className="px-3 py-1 text-left text-xs uppercase" colSpan={2}>Kerr Maya Vase Database</th>
            <th className="px-3 py-1 text-right text-xs">{data ? `${data.total.toLocaleString()} vessels` : ''}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-2" colSpan={3}>
              <input
                type="text"
                className="w-full py-1.5 px-2 bg-white border-2 border-black text-black text-sm focus:outline-none placeholder:text-black/40"
                placeholder="Search by K-number or description..."
                value={query}
                onChange={handleQueryChange}
              />
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
                <span className="ml-2 cursor-pointer underline" onClick={() => setPage(1)}>Retry</span>
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

      {!loading && !error && data && data.results.length === 0 && (
        <table className="w-auto">
          <tbody>
            <tr>
              <td className="px-3 py-8 text-sm text-center">No vessels found. Try adjusting your search.</td>
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

          {totalPages > 1 && (
            <table className="w-auto mt-4">
              <tbody>
                <tr>
                  <td className="px-3 py-2 text-sm">
                    <span
                      className={`cursor-pointer ${page <= 1 ? 'opacity-30 pointer-events-none' : 'underline hover:no-underline'}`}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      &lt; Previous
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center">Page {page} of {totalPages}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span
                      className={`cursor-pointer ${page >= totalPages ? 'opacity-30 pointer-events-none' : 'underline hover:no-underline'}`}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next &gt;
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
