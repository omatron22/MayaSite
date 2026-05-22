import { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { clickableProps } from '../components/ui/ClickableCell';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { fetchTwkmCollection, type TwkmArtefactRow, type TwkmPlaceRow } from '../lib/api';

type Tab = 'artefacts' | 'places';
const PAGE_SIZE = 48;
const DEBOUNCE_DELAY = 300;

export function TwkmCollectionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') === 'places' ? 'places' : 'artefacts'));
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') || '');
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1')));
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_DELAY);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  useEffect(() => { setPage(1); }, [tab, debouncedQuery]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (tab !== 'artefacts') p.set('tab', tab);
    if (debouncedQuery) p.set('q', debouncedQuery);
    if (page > 1) p.set('page', String(page));
    setSearchParams(p, { replace: true });
  }, [tab, debouncedQuery, page, setSearchParams]);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ['twkm-collection', tab, debouncedQuery, page],
    queryFn: ({ signal }) => fetchTwkmCollection({ tab, q: debouncedQuery, page, pageSize: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const refreshing = isFetching && !isPending;

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      {/* Collection tabs */}
      <table className="w-auto">
        <tbody>
          <tr>
            <td {...clickableProps(() => navigate('/collections/kerr'))} className="px-3 py-1 cursor-pointer focus-cell">
              <span className="text-sm">Kerr Vases</span>
            </td>
            <td {...clickableProps(() => navigate('/collections/cmhi'))} className="px-3 py-1 cursor-pointer focus-cell">
              <span className="text-sm">CMHI</span>
            </td>
            <td className="px-3 py-1">
              <span className="text-sm font-[800]">[TWKM]</span>
            </td>
            <td {...clickableProps(() => navigate('/collections/schele'))} className="px-3 py-1 cursor-pointer focus-cell">
              <span className="text-sm">Schele</span>
            </td>
            <td {...clickableProps(() => navigate('/collections/montgomery'))} className="px-3 py-1 cursor-pointer focus-cell">
              <span className="text-sm">Montgomery</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Sub-tabs */}
      <table className="w-auto mt-2">
        <tbody>
          <tr>
            <td {...clickableProps(() => setTab('artefacts'), { ariaSelected: tab === 'artefacts' })} className="px-3 py-1 cursor-pointer focus-cell">
              <span className="text-xs">{tab === 'artefacts' ? <strong>[Artefacts]</strong> : 'Artefacts'}</span>
            </td>
            <td {...clickableProps(() => setTab('places'), { ariaSelected: tab === 'places' })} className="px-3 py-1 cursor-pointer focus-cell">
              <span className="text-xs">{tab === 'places' ? <strong>[Places]</strong> : 'Places'}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Search bar */}
      <table className="w-auto mt-2">
        <tbody>
          <tr>
            <td className="px-3 py-2 cursor-text min-w-[400px]" onClick={() => inputRef.current?.focus()}>
              <div className="flex items-center">
                <span className="font-[800] select-none shrink-0">&gt;&nbsp;</span>
                <input
                  ref={inputRef}
                  type="text"
                  aria-label={`search TWKM ${tab}`}
                  className="absolute opacity-0 pointer-events-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
                {inputFocused || query ? (
                  <>
                    <span className="font-[600]">{query}</span>
                    <span className="blink-cursor font-[800] select-none">|</span>
                  </>
                ) : (
                  <span className="select-none">search by label...</span>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {data && !isPending && (
        <div className="flex items-center justify-between mt-4 mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <strong>{total.toLocaleString()}</strong> {tab}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-[10px]">
                  Data: <a href="https://classicmayan.org" target="_blank" rel="noopener noreferrer" className="underline">ClassicMayan.org</a> (TWKM, Universität Bonn). CC BY 4.0.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <table className="w-auto mt-4"><tbody><tr><td className="px-3 py-2 text-sm">{(error as Error).message}</td></tr></tbody></table>
      )}

      {isPending && (
        <div className="flex items-center justify-center py-16"><ProgressBarLoader /></div>
      )}

      {!isPending && results.length > 0 && (
        <div className={`transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {tab === 'artefacts' ? (
                  <>
                    <th className="px-3 py-1 text-left text-xs uppercase">Label</th>
                    <th className="px-3 py-1 text-right text-xs uppercase">Date</th>
                    <th className="px-3 py-1 text-left text-xs uppercase">Places</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-1 text-left text-xs uppercase">Place</th>
                    <th className="px-3 py-1 text-right text-xs uppercase">Lat</th>
                    <th className="px-3 py-1 text-right text-xs uppercase">Lon</th>
                    <th className="px-3 py-1 text-right text-xs uppercase">Blocks</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === 'artefacts'
                ? (results as TwkmArtefactRow[]).map((r) => (
                    <tr key={r.artefact_id}>
                      <td className="px-3 py-1 text-xs font-[800]">{r.label}</td>
                      <td className="px-3 py-1 text-xs text-right whitespace-nowrap">
                        {r.date_start != null && r.date_end != null
                          ? `${r.date_start}–${r.date_end}`
                          : r.date_start ?? r.date_end ?? '-'}
                      </td>
                      <td className="px-3 py-1 text-xs">{r.places?.join(', ') || '-'}</td>
                    </tr>
                  ))
                : (results as TwkmPlaceRow[]).map((r) => (
                    <tr key={r.place_id}>
                      <td className="px-3 py-1 text-xs font-[800]">
                        <Link to={`/search?mode=blocks&sites=${encodeURIComponent(r.label)}`} className="underline hover:no-underline">
                          {r.label}
                        </Link>
                      </td>
                      <td className="px-3 py-1 text-xs text-right">{r.latitude?.toFixed(3) ?? '-'}</td>
                      <td className="px-3 py-1 text-xs text-right">{r.longitude?.toFixed(3) ?? '-'}</td>
                      <td className="px-3 py-1 text-xs text-right">{r.block_count?.toLocaleString() ?? '-'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <table className="w-auto mt-6">
              <tbody>
                <tr>
                  {page > 1 && (
                    <td {...clickableProps(() => setPage(page - 1), { ariaLabel: 'Previous page' })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">Prev</span>
                    </td>
                  )}
                  <td className="px-3 py-1" aria-current="page">
                    <strong>[{page} / {totalPages}]</strong>
                  </td>
                  {page < totalPages && (
                    <td {...clickableProps(() => setPage(page + 1), { ariaLabel: 'Next page' })} className="px-3 py-1 cursor-pointer focus-cell">
                      <span className="text-sm">Next</span>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
