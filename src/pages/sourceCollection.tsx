import { useState, useEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clickableProps } from '../components/ui/ClickableCell';
import { ProgressBarLoader } from '../components/ui/ProgressBarLoader';
import { fetchSourceCollection } from '../lib/api';

const PAGE_SIZE = 48;
const DEBOUNCE = 300;

// Slug → collection_id mapping
const COLLECTION_MAP: Record<string, { id: string; siblings: { slug: string; label: string }[] }> = {
  schele: {
    id: 'schele-lacma',
    siblings: [
      { slug: 'kerr', label: 'Kerr Vases' },
      { slug: 'cmhi', label: 'CMHI' },
      { slug: 'twkm', label: 'TWKM' },
      { slug: 'montgomery', label: 'Montgomery' },
    ],
  },
  montgomery: {
    id: 'famsi-montgomery',
    siblings: [
      { slug: 'kerr', label: 'Kerr Vases' },
      { slug: 'cmhi', label: 'CMHI' },
      { slug: 'twkm', label: 'TWKM' },
      { slug: 'schele', label: 'Schele' },
    ],
  },
};

export function SourceCollectionPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const collectionConfig = slug ? COLLECTION_MAP[slug] : null;
  const collectionId = collectionConfig?.id || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') || '');
  const [site, setSite] = useState<string>(() => searchParams.get('site') || '');
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1')));
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  useEffect(() => { setPage(1); }, [debouncedQuery, site, slug]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQuery) sp.set('q', debouncedQuery);
    if (site) sp.set('site', site);
    if (page > 1) sp.set('page', String(page));
    setSearchParams(sp, { replace: true });
  }, [debouncedQuery, site, page, setSearchParams]);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ['source-collection', collectionId, debouncedQuery, site, page],
    queryFn: ({ signal }) => fetchSourceCollection({ collection: collectionId, q: debouncedQuery, site, page, pageSize: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
    enabled: !!collectionId,
  });

  if (!collectionConfig) {
    return <div className="max-w-[80ch] mx-auto px-4 py-4 text-sm">Unknown collection: {slug}</div>;
  }

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const sites = data?.sites ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const refreshing = isFetching && !isPending;

  return (
    <div className="max-w-[80ch] mx-auto px-4 py-4">
      {/* Collection tabs */}
      <table className="w-auto">
        <tbody>
          <tr>
            {collectionConfig.siblings.map((sib) => (
              <td key={sib.slug} {...clickableProps(() => navigate(`/collections/${sib.slug}`))} className="px-3 py-1 cursor-pointer focus-cell">
                <span className="text-sm">{sib.label}</span>
              </td>
            ))}
            <td className="px-3 py-1">
              <span className="text-sm font-[800]">[{data?.collection?.title || slug}]</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Search */}
      <table className="w-auto mt-2">
        <tbody>
          <tr>
            <td className="px-3 py-2 cursor-text min-w-[400px]" onClick={() => inputRef.current?.focus()}>
              <div className="flex items-center">
                <span className="font-[800] select-none shrink-0">&gt;&nbsp;</span>
                <input
                  ref={inputRef}
                  type="text"
                  aria-label={`Search ${slug}`}
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
                  <span className="select-none">search by title, site, description...</span>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Site filter chips */}
      {sites.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSite('')}
            className={`px-2 py-0.5 text-xs border ${site === '' ? 'font-[800] border-black' : 'border-gray-300'}`}
          >
            All sites
          </button>
          {sites.map((s) => (
            <button
              key={s.site_name}
              type="button"
              onClick={() => setSite(s.site_name)}
              className={`px-2 py-0.5 text-xs border ${site === s.site_name ? 'font-[800] border-black' : 'border-gray-300'}`}
            >
              {s.site_name} ({s.n})
            </button>
          ))}
        </div>
      )}

      {data && !isPending && (
        <div className="flex items-center justify-between mt-4 mb-4">
          <table className="w-auto">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-sm">
                  <strong>{total.toLocaleString()}</strong> items
                  {site && <span> at {site}</span>}
                </td>
              </tr>
              {data.collection?.rights_note && (
                <tr>
                  <td className="px-3 py-1 text-[10px]">{data.collection.rights_note}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <table className="w-auto mt-4"><tbody><tr><td className="px-3 py-2 text-sm">{(error as Error).message}</td></tr></tbody></table>
      )}

      {isPending && <div className="flex items-center justify-center py-16"><ProgressBarLoader /></div>}

      {!isPending && results.length > 0 && (
        <div className={`transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-0 border-t-2 border-l-2 border-black">
            {results.map((r) => {
              const linkOut = r.source_url || r.image_url;
              return (
                <a
                  key={r.item_id}
                  href={linkOut || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-r-2 border-b-2 border-black overflow-hidden no-underline block"
                >
                  <div className="bg-white aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {r.thumb_url || r.image_url ? (
                      <img
                        src={r.thumb_url || r.image_url || ''}
                        alt={r.title || r.external_id}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-xs text-gray-500">no image</span>
                    )}
                  </div>
                  <div className="px-2 py-1.5 border-t border-black">
                    <span className="text-xs font-[800] text-black underline">{r.object_number || r.external_id}</span>
                    {r.title && <p className="text-[10px] text-black line-clamp-2 leading-snug m-0 mt-0.5">{r.title}</p>}
                    {r.site_name && <p className="text-[9px] m-0 mt-0.5 text-gray-700">{r.site_name}</p>}
                  </div>
                </a>
              );
            })}
          </div>

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

      {!isPending && results.length === 0 && (
        <p className="text-sm py-8 text-center">No items found.</p>
      )}

      <p className="mt-8 text-[10px] text-gray-600">
        Source:{' '}
        <a href={data?.collection?.source_url || '#'} target="_blank" rel="noopener noreferrer" className="underline">
          {data?.collection?.provider}
        </a>
      </p>
    </div>
  );
}
