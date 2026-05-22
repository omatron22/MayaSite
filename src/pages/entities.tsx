import { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { clickableProps } from '../components/ui/ClickableCell';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { fetchEntities } from '../lib/api';

type EntityTypeFilter = 'all' | 'person' | 'place' | 'scribe';

const PAGE_SIZE = 50;
const DEBOUNCE_DELAY = 300;

export function EntitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') || '');
  const [inputFocused, setInputFocused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EntityTypeFilter>(() => {
    const t = searchParams.get('type');
    return t === 'person' || t === 'place' || t === 'scribe' ? t : 'all';
  });
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_DELAY);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  useEffect(() => { setPage(1); }, [debouncedQuery, typeFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, typeFilter, page, setSearchParams]);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ['entities', debouncedQuery, typeFilter, page],
    queryFn: ({ signal }) => fetchEntities({
      q: debouncedQuery,
      entityType: typeFilter !== 'all' ? typeFilter : undefined,
      page, pageSize: PAGE_SIZE,
    }, signal),
    placeholderData: keepPreviousData,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const refreshing = isFetching && !isPending;

  const typeTab = (val: EntityTypeFilter, label: string) => {
    const active = typeFilter === val;
    return (
      <td {...clickableProps(() => setTypeFilter(val), { ariaSelected: active })} className="px-3 py-1 cursor-pointer focus-cell">
        <span className="text-sm inline-grid">
          <span className="invisible col-start-1 row-start-1 font-[800]">[{label}]</span>
          <span className="col-start-1 row-start-1">
            {active ? <strong>[{label}]</strong> : label}
          </span>
        </span>
      </td>
    );
  };

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-6">
      <table className="w-full">
        <tbody>
          <tr>
            <td colSpan={5} className="px-3 py-2 cursor-text" onClick={() => inputRef.current?.focus()}>
              <div className="flex items-center">
                <span className="font-[800] select-none shrink-0">&gt;&nbsp;</span>
                <input
                  ref={inputRef}
                  type="search"
                  aria-label="Search rulers, places, scribes"
                  className="absolute opacity-0 pointer-events-none"
                  style={{ caretColor: 'transparent', fontSize: '16px' }}
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
                  <span className="select-none">search rulers, places, scribes...</span>
                )}
              </div>
            </td>
          </tr>
          <tr>
            {typeTab('all', 'All')}
            {typeTab('person', 'Rulers')}
            {typeTab('place', 'Places')}
            {typeTab('scribe', 'Scribes')}
          </tr>
        </tbody>
      </table>

      {isPending && (
        <div className="flex items-center justify-center py-4">
          <ProgressBarLoader />
        </div>
      )}

      {error && (
        <table className="w-auto mt-6"><tbody><tr>
          <td className="px-3 py-2 text-sm">{(error as Error).message || 'Failed to load entities'}</td>
        </tr></tbody></table>
      )}

      {!isPending && (
        <div className={`mt-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-1 text-left text-xs uppercase">Name</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Type</th>
                <th className="px-3 py-1 text-left text-xs uppercase">Aliases</th>
                <th className="px-3 py-1 text-right text-xs uppercase">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16">No entities found.</td></tr>
              ) : (
                results.map((e) => (
                  <tr key={e.entity_id}>
                    <td className="px-3 py-1 font-[800]">
                      <Link
                        to={`/search?mode=blocks&q=${encodeURIComponent(e.canonical_name)}`}
                        className="underline hover:no-underline"
                      >
                        {e.canonical_name}
                      </Link>
                      {e.description && <div className="text-[10px]">{e.description}</div>}
                    </td>
                    <td className="px-3 py-1 text-xs">{e.entity_type}</td>
                    <td className="px-3 py-1 text-[11px] max-w-[260px] truncate" title={e.aliases ?? ''}>
                      {e.aliases || '-'}
                    </td>
                    <td className="px-3 py-1 text-xs text-right">{e.block_count.toLocaleString()}</td>
                  </tr>
                ))
              )}
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
